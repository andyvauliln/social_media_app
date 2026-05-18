/**
 * Shared GitHub repository + code discovery for index.html and project.html.
 * Expects caller to pass ghFetch (authenticated) and sleep(ms).
 *
 * Optional diagnostic callbacks in params (all no-ops if omitted, so older
 * callers keep working unchanged):
 *   onProgress(pct, message, detail)  — overall progress, 5–80% band
 *   onKeywordResult(keyword, count)   — unique repos a keyword contributed
 *   onPartial(reason)                 — fired once if GitHub aborted a scan early
 */
(function (global) {
  'use strict';

  // GitHub Search API allows up to 100 results per page; using the maximum
  // means ~3× fewer HTTP round-trips (and rate-limit hits) than per_page=30.
  var REPO_PER_PAGE = 100;
  var CODE_PER_PAGE = 100;
  var REPO_PAGE_SLEEP_MS = 120;
  var CODE_PAGE_SLEEP_MS = 850;
  var README_VERIFY_SLEEP_MS = 90;
  var BACKFILL_SLEEP_MS = 80;
  var MAX_REPO_SEARCH_PAGES = 34;
  // Mode B downloads one README per candidate; cap downloads per keyword so a
  // broad query cannot trigger ~1000 sequential fetches.
  var MAX_README_VERIFY_PER_KEYWORD = 80;

  // Discovery owns the 5–80% progress band; the caller owns 80–100%
  // (enrichment + save). progressPct() maps a 0–1 fraction into that band.
  var PROGRESS_START = 5;
  var PROGRESS_END = 80;
  function progressPct(frac) {
    var f = frac < 0 ? 0 : frac > 1 ? 1 : frac;
    return PROGRESS_START + Math.round((PROGRESS_END - PROGRESS_START) * f);
  }

  /**
   * Multi-word keywords are sent as GitHub phrase queries ("a b") so matches align
   * with a contiguous phrase in name/description/topics/readme. This makes search
   * strict by default. Single words, already-quoted strings, and any keyword that
   * already contains " are left as-is.
   */
  function phraseSearchTermForGitHub(kw) {
    var s = String(kw == null ? '' : kw).trim();
    if (!s) return s;
    if (s.length >= 2 && s.charAt(0) === '"' && s.charAt(s.length - 1) === '"') return s;
    if (s.indexOf('"') !== -1) return s;
    if (/\s/.test(s)) return '"' + s + '"';
    return s;
  }

  function buildRepoSearchQuery(kw, langs, opt) {
    var inFields = [];
    if (opt.inName) inFields.push('name');
    if (opt.inDescription) inFields.push('description');
    if (opt.inTopics) inFields.push('topics');
    if (opt.inReadme) inFields.push('readme');
    if (!inFields.length) return null;
    var term = phraseSearchTermForGitHub(kw);
    if (!term) return null;
    var q = term + ' in:' + inFields.join(',');
    if (langs && langs.length) q += ' language:' + langs.join(' language:');
    // stars:>=N so a repo with exactly N stars is kept — matches the "Min stars: N" label.
    if (opt.minStars > 0) q += ' stars:>=' + opt.minStars;
    if (opt.excludeForks) q += ' fork:false';
    return q;
  }

  function buildCodeSearchQuery(kw, langs) {
    var q = phraseSearchTermForGitHub(kw);
    if (!q) return null;
    if (langs && langs.length) q += ' ' + langs.map(function (l) { return 'language:' + l; }).join(' ');
    return q;
  }

  function buildFileCodeSearchQuery(contentPhrase, fileName, langs) {
    var q = phraseSearchTermForGitHub(contentPhrase);
    if (!q) return null;
    var fn = String(fileName || '').trim();
    if (!fn) return null;
    if (fn.indexOf('/') !== -1) q += ' path:' + fn;
    else q += ' filename:' + fn;
    if (langs && langs.length) {
      q += ' ' + langs.map(function (l) { return 'language:' + l; }).join(' ');
    }
    return q;
  }

  function fileSearchScope(opt) {
    return !!opt.includeFileSearch;
  }

  /**
   * File search runs one query per term. Terms are the "file must contain"
   * phrase plus every keyword — so you can give several keywords and each is
   * searched independently inside the named file.
   */
  function fileSearchTerms(opt, kws) {
    var terms = [];
    var fc = String(opt.fileContains || '').trim();
    if (fc) terms.push(fc);
    for (var i = 0; i < (kws || []).length; i++) {
      var t = String(kws[i] || '').trim();
      if (t && terms.indexOf(t) === -1) terms.push(t);
    }
    return terms;
  }

  function fullRepoToSearchItem(data) {
    if (!data || data.id == null) return null;
    return {
      id: data.id,
      name: data.name,
      full_name: data.full_name,
      description: data.description,
      html_url: data.html_url,
      homepage: data.homepage || '',
      language: data.language,
      stargazers_count: data.stargazers_count,
      forks_count: data.forks_count,
      open_issues_count: data.open_issues_count,
      created_at: data.created_at,
      pushed_at: data.pushed_at,
      topics: data.topics || [],
      license: data.license,
      archived: data.archived || false,
      default_branch: data.default_branch || 'main',
      fork: data.fork || false,
    };
  }

  function passesStarForkFilter(item, opt) {
    if (opt.excludeForks && item.fork) return false;
    var stars = item.stargazers_count;
    if (opt.minStars > 0) {
      // Reject only below the threshold; exactly minStars passes (label says "min").
      if (stars == null || stars < opt.minStars) return false;
    }
    return true;
  }

  function readmeOnlyScope(opt) {
    return !!opt.inReadme && !opt.inName && !opt.inDescription && !opt.inTopics;
  }

  function readmeVerifyNeedle(kw) {
    var s = String(kw == null ? '' : kw).trim();
    if (s.length >= 2 && s.charAt(0) === '"' && s.charAt(s.length - 1) === '"') {
      s = s.slice(1, -1).trim();
    }
    return String(s || '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
  }

  function readmeHaystack(text) {
    return String(text == null ? '' : text)
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
  }

  function readmeContainsKeywordPhrase(text, kw) {
    var needle = readmeVerifyNeedle(kw);
    if (!needle) return false;
    var hay = readmeHaystack(text);
    return hay.indexOf(needle) !== -1;
  }

  async function fetchReadmeTextDecoded(fullName, ghFetch) {
    var parts = String(fullName || '').split('/');
    if (parts.length < 2) return null;
    var url =
      'https://api.github.com/repos/' + parts.map(encodeURIComponent).join('/') + '/readme';
    try {
      var data = await ghFetch(url);
      if (!data || !data.content || data.encoding !== 'base64') return null;
      var b64 = String(data.content).replace(/\s/g, '');
      var binary = atob(b64);
      if (typeof TextDecoder !== 'undefined') {
        var bytes = new Uint8Array(binary.length);
        for (var bi = 0; bi < binary.length; bi++) bytes[bi] = binary.charCodeAt(bi);
        return new TextDecoder('utf-8', { fatal: false }).decode(bytes);
      }
      try {
        return decodeURIComponent(escape(binary));
      } catch (e) {
        return binary;
      }
    } catch (e) {
      return null;
    }
  }

  /**
   * @param {object} opt
   * @param {number} opt.minStars
   * @param {boolean} opt.excludeForks
   * @param {boolean} opt.inName
   * @param {boolean} opt.inDescription
   * @param {boolean} opt.inTopics
   * @param {boolean} opt.inReadme
   * @param {boolean} opt.includeCodeSearch
   * @param {boolean} opt.includeFileSearch
   * @param {string} opt.fileName
   * @param {string} opt.fileContains
   */
  function validateDiscoveryOptions(opt) {
    if (fileSearchScope(opt)) {
      if (!String(opt.fileName || '').trim()) {
        throw new Error('Specify a file name to search in.');
      }
      return;
    }
    var anyRepo = opt.inName || opt.inDescription || opt.inTopics || opt.inReadme;
    if (!anyRepo && !opt.includeCodeSearch) {
      throw new Error('Select at least one place to search.');
    }
  }

  function repoFieldsLabel(opt) {
    var parts = [];
    if (opt.inName) parts.push('name');
    if (opt.inDescription) parts.push('description');
    if (opt.inTopics) parts.push('topics');
    if (opt.inReadme) parts.push('readme');
    return parts.join(', ');
  }

  function discoveryFiltersSummary(opt) {
    var bits = [];
    if (opt.minStars > 0) bits.push('stars>=' + opt.minStars);
    if (opt.excludeForks) bits.push('exclude forks');
    return bits.join(' · ');
  }

  function discoveryContextDetail(kw, kwIndex, kwTotal, langs, opt) {
    var langPart = langs && langs.length ? 'Languages: ' + langs.join(', ') : 'Languages: any';
    var filt = discoveryFiltersSummary(opt);
    var tail = filt ? ' · ' + filt : '';
    if (fileSearchScope(opt)) {
      return (
        'File search ' + (kwIndex + 1) + '/' + kwTotal + ': ' + kw +
        ' · file: ' + String(opt.fileName || '').trim() + ' · ' + langPart + tail
      );
    }
    var fields = repoFieldsLabel(opt);
    return (
      'Keyword ' + (kwIndex + 1) + '/' + kwTotal + ': ' + kw +
      ' · GitHub in: ' + (fields || '—') + ' · ' + langPart + tail
    );
  }

  /** A GitHub 422 (bad query) or 403 (rate limit) means: stop scanning, keep what we have. */
  function isGitHubScanLimit(e) {
    return !!(e && e.message && (e.message.indexOf('422') !== -1 || e.message.indexOf('403') !== -1));
  }

  /**
   * Fetch full repo metadata for a code-search hit (code search returns thin
   * repo objects). Results are cached per run so the same repo surfacing under
   * several keywords is fetched only once.
   */
  async function backfillRepoMetadata(mapped, ctx) {
    var key = String(mapped.full_name || '');
    if (key && ctx.repoCache.has(key)) return ctx.repoCache.get(key);
    var result = mapped;
    try {
      var segs = key.split('/').map(function (s) { return encodeURIComponent(s); }).join('/');
      var full = await ctx.ghFetch('https://api.github.com/repos/' + segs);
      var merged = fullRepoToSearchItem(full);
      if (merged) result = merged;
    } catch (e) {
      /* keep partial metadata */
    }
    await ctx.sleep(BACKFILL_SLEEP_MS);
    if (key) ctx.repoCache.set(key, result);
    return result;
  }

  /**
   * Shared inner loop for code search (Mode C) and file search (Mode D): map a
   * page of code hits to deduplicated, filtered repo records and push them.
   * Pass fileNameFallback (a string) to record the matched file path; pass null
   * to keep only the repository.
   * @returns {Promise<number>} new repos added from this page
   */
  async function processCodeSearchPage(ctx, items, fileNameFallback) {
    var added = 0;
    var list = items || [];
    for (var i = 0; i < list.length && ctx.repos.length < ctx.maxResults; i++) {
      var item = list[i];
      var repo = item && item.repository;
      if (!repo || repo.id == null || ctx.seenIds.has(repo.id)) continue;
      var mapped = fullRepoToSearchItem(repo);
      if (!mapped) continue;
      if (mapped.stargazers_count == null || mapped.fork == null) {
        mapped = await backfillRepoMetadata(mapped, ctx);
      }
      if (!passesStarForkFilter(mapped, ctx.opt)) continue;
      if (ctx.seenIds.has(mapped.id)) continue;
      ctx.seenIds.add(mapped.id);
      if (fileNameFallback != null) {
        var filePath = String((item && item.path) || fileNameFallback || '').trim();
        ctx.repos.push(Object.assign({}, mapped, { search_file_path: filePath }));
      } else {
        ctx.repos.push(mapped);
      }
      added++;
    }
    return added;
  }

  /**
   * @param {object} params
   * @param {string[]} params.keywords
   * @param {string[]} params.langs
   * @param {number} params.maxResults
   * @param {object} params.options — discovery only (not extractPackages)
   * @param {function(string): Promise<any>} params.ghFetch
   * @param {function(number): Promise<void>} params.sleep
   * @param {function(number, string, string): void} [params.onProgress]
   * @param {function(string, number): void} [params.onKeywordResult]
   * @param {function(string): void} [params.onPartial]
   * @returns {Promise<object[]>} raw repo objects for enrichRepos
   */
  async function runGitHubRepoDiscovery(params) {
    var kws = params.keywords || [];
    var langs = params.langs || [];
    var maxResults = Math.min(Math.max(1, params.maxResults || 100), 1000);
    var opt = params.options || {};
    var ghFetch = params.ghFetch;
    var sleep = params.sleep;
    var onProgress = params.onProgress || function () {};
    var onKeywordResult = params.onKeywordResult || function () {};
    var onPartial = params.onPartial || function () {};

    validateDiscoveryOptions(opt);

    var seenIds = new Set();
    var repos = [];
    var anyRepoScope = opt.inName || opt.inDescription || opt.inTopics || opt.inReadme;
    var readmeOnly = readmeOnlyScope(opt);

    // Shared context for the code-search helpers.
    var ctx = {
      ghFetch: ghFetch,
      sleep: sleep,
      seenIds: seenIds,
      repos: repos,
      maxResults: maxResults,
      opt: opt,
      repoCache: new Map(),
    };

    // Report a truncated/partial scan to the caller exactly once.
    var partialFlagged = false;
    function flagPartial(e) {
      if (partialFlagged) return;
      partialFlagged = true;
      onPartial(e && e.message ? e.message : 'GitHub limited the scan');
    }

    // ── Mode D — search inside a named file ───────────────────────────────
    if (fileSearchScope(opt)) {
      var fileName = String(opt.fileName || '').trim();
      var fterms = fileSearchTerms(opt, kws);
      if (!fterms.length) {
        throw new Error('Enter what the file must contain, or add keywords.');
      }
      var budgetFilePerTerm = Math.max(1, Math.ceil(maxResults / fterms.length / CODE_PER_PAGE));
      var fileWorkTotal = fterms.length * budgetFilePerTerm;
      var fileWorkDone = 0;
      onProgress(
        progressPct(0),
        'File search',
        'GitHub code search in "' + fileName + '" for each phrase (filename/path qualifier + file body)'
      );
      for (var fti = 0; fti < fterms.length && repos.length < maxResults; fti++) {
        var fterm = fterms[fti];
        var fq = buildFileCodeSearchQuery(fterm, fileName, langs);
        if (!fq) continue;
        var fBefore = repos.length;
        onProgress(
          progressPct(fileWorkDone / fileWorkTotal),
          'File search',
          discoveryContextDetail(fterm, fti, fterms.length, langs, opt) +
            ' · matches file contents with filename/path filter'
        );
        for (var fpage = 1; fpage <= budgetFilePerTerm && repos.length < maxResults; fpage++) {
          var fdata;
          try {
            fdata = await ghFetch(
              'https://api.github.com/search/code?q=' +
                encodeURIComponent(fq) +
                '&per_page=' + CODE_PER_PAGE + '&page=' + fpage
            );
          } catch (e) {
            if (isGitHubScanLimit(e)) { flagPartial(e); break; }
            throw e;
          }
          var fadded = await processCodeSearchPage(ctx, fdata.items, fileName);
          fileWorkDone++;
          onProgress(
            progressPct(fileWorkDone / fileWorkTotal),
            'File search · page ' + fpage,
            '"' + fterm + '" in ' + fileName + ' · +' + fadded + ' new · ' + repos.length + '/' + maxResults
          );
          await sleep(CODE_PAGE_SLEEP_MS);
        }
        onKeywordResult(fterm, repos.length - fBefore);
      }
      return repos.slice(0, maxResults);
    }

    // ── Mode B — README phrase verification ───────────────────────────────
    if (anyRepoScope && readmeOnly) {
      var verifiedIds = new Set();
      for (var vki = 0; vki < kws.length && repos.length < maxResults; vki++) {
        var vkw = kws[vki];
        var vq = buildRepoSearchQuery(vkw, langs, opt);
        if (!vq) continue;
        var vBefore = repos.length;
        var readmeFetches = 0;
        onProgress(
          progressPct(vki / kws.length),
          'Repository search — README phrase verify',
          discoveryContextDetail(vkw, vki, kws.length, langs, opt) +
            ' · README body must contain the phrase (API metadata is not enough)'
        );
        pageLoop: for (var vpage = 1; vpage <= MAX_REPO_SEARCH_PAGES && repos.length < maxResults; vpage++) {
          var vdata;
          try {
            vdata = await ghFetch(
              'https://api.github.com/search/repositories?q=' +
                encodeURIComponent(vq) +
                '&sort=stars&order=desc&per_page=' + REPO_PER_PAGE + '&page=' + vpage
            );
          } catch (e) {
            if (e.message && e.message.indexOf('422') !== -1) { flagPartial(e); break pageLoop; }
            throw e;
          }
          var vitems = vdata.items || [];
          if (!vitems.length) break pageLoop;
          for (var vi = 0; vi < vitems.length && repos.length < maxResults; vi++) {
            var vr = vitems[vi];
            if (vr.fork || verifiedIds.has(vr.id)) continue;
            if (!passesStarForkFilter(vr, opt)) continue;
            if (readmeFetches >= MAX_README_VERIFY_PER_KEYWORD) break pageLoop;
            onProgress(
              progressPct(vki / kws.length),
              'README check: ' + vr.full_name,
              'Keyword: ' + vkw + ' · kept ' + repos.length + '/' + maxResults + ' so far'
            );
            var rtext = await fetchReadmeTextDecoded(vr.full_name, ghFetch);
            readmeFetches++;
            await sleep(README_VERIFY_SLEEP_MS);
            if (!readmeContainsKeywordPhrase(rtext, vkw)) continue;
            verifiedIds.add(vr.id);
            seenIds.add(vr.id);
            repos.push(Object.assign({}, vr, { readme: rtext || '', readme_fetched: true }));
          }
          await sleep(REPO_PAGE_SLEEP_MS);
          if (vitems.length < REPO_PER_PAGE) break pageLoop;
        }
        onKeywordResult(vkw, repos.length - vBefore);
      }
    // ── Mode A — repository name / description / topics ───────────────────
    } else if (anyRepoScope) {
      var budgetPerKw = Math.max(1, Math.ceil(maxResults / kws.length / REPO_PER_PAGE));
      for (var ki = 0; ki < kws.length && repos.length < maxResults; ki++) {
        var kw = kws[ki];
        var q = buildRepoSearchQuery(kw, langs, opt);
        if (!q) continue;
        var aBefore = repos.length;
        onProgress(
          progressPct((ki / kws.length) * 0.6),
          'Repository search (metadata)',
          discoveryContextDetail(kw, ki, kws.length, langs, opt)
        );
        for (var page = 1; page <= budgetPerKw && repos.length < maxResults; page++) {
          var data;
          try {
            data = await ghFetch(
              'https://api.github.com/search/repositories?q=' +
                encodeURIComponent(q) +
                '&sort=stars&order=desc&per_page=' + REPO_PER_PAGE + '&page=' + page
            );
          } catch (e) {
            if (e.message && e.message.indexOf('422') !== -1) { flagPartial(e); break; }
            throw e;
          }
          var added = 0;
          var items = data.items || [];
          for (var ri = 0; ri < items.length; ri++) {
            var r = items[ri];
            if (!seenIds.has(r.id) && !r.fork) {
              seenIds.add(r.id);
              repos.push(r);
              added++;
            }
          }
          var aFrac = ((ki * budgetPerKw + page) / (kws.length * budgetPerKw)) * 0.6;
          onProgress(
            progressPct(aFrac),
            'Repository search · page ' + page,
            '"' + kw + '" · +' + added + ' new this page · ' + repos.length + '/' + maxResults + ' total'
          );
          await sleep(REPO_PAGE_SLEEP_MS);
        }
        onKeywordResult(kw, repos.length - aBefore);
      }
    }

    if (!opt.includeCodeSearch || repos.length >= maxResults) {
      return repos.slice(0, maxResults);
    }

    // ── Mode C — code search top-up pass ──────────────────────────────────
    onProgress(
      progressPct(0.6),
      'Code search — extra pass',
      'Only ' + repos.length + '/' + maxResults +
        ' repos from repository search; scanning source files per keyword until quota or pages run out'
    );
    var budgetCodePerKw = Math.max(1, Math.ceil(maxResults / kws.length / CODE_PER_PAGE));
    for (var cki = 0; cki < kws.length && repos.length < maxResults; cki++) {
      var ckw = kws[cki];
      var cq = buildCodeSearchQuery(ckw, langs);
      if (!cq) continue;
      var cBefore = repos.length;
      onProgress(
        progressPct(0.6 + (cki / kws.length) * 0.4),
        'Code search',
        discoveryContextDetail(ckw, cki, kws.length, langs, opt) +
          ' · matches file contents (not just repo metadata)'
      );
      for (var cpage = 1; cpage <= budgetCodePerKw && repos.length < maxResults; cpage++) {
        var cdata;
        try {
          cdata = await ghFetch(
            'https://api.github.com/search/code?q=' +
              encodeURIComponent(cq) +
              '&per_page=' + CODE_PER_PAGE + '&page=' + cpage
          );
        } catch (e) {
          if (isGitHubScanLimit(e)) { flagPartial(e); break; }
          throw e;
        }
        var cadded = await processCodeSearchPage(ctx, cdata.items, null);
        var cFrac = 0.6 + ((cki * budgetCodePerKw + cpage) / (kws.length * budgetCodePerKw)) * 0.4;
        onProgress(
          progressPct(cFrac),
          'Code search · page ' + cpage,
          '"' + ckw + '" · +' + cadded + ' new this page · ' + repos.length + '/' + maxResults + ' total'
        );
        await sleep(CODE_PAGE_SLEEP_MS);
      }
      onKeywordResult(ckw, repos.length - cBefore);
    }

    return repos.slice(0, maxResults);
  }

  // ── temp_files staging helpers ────────────────────────────────────────
  // A repo's readme + stack + notes live in `temp_files` while it is not yet
  // cloned; on clone they are flushed to the repo's docs/ folder as .md files.

  /** Render an extracted package list as a Markdown doc holding raw JSON. */
  function packagesToStackFileText(packages) {
    if (!Array.isArray(packages) || !packages.length) return '';
    return (
      '# Stack\n\nExtracted dependencies (raw JSON):\n\n```json\n' +
      JSON.stringify(packages, null, 2) +
      '\n```\n'
    );
  }

  /** Inverse of packagesToStackFileText — recover the packages array. */
  function packagesFromStackFile(text) {
    var s = String(text == null ? '' : text);
    var m = s.match(/```json\s*([\s\S]*?)```/);
    var raw = m ? m[1] : s;
    try {
      var a = JSON.parse(String(raw).trim());
      return Array.isArray(a) ? a : [];
    } catch (e) {
      return [];
    }
  }

  /** Build the 3-entry temp_files array (readme, stack, notes) for a repo. */
  function buildRepoTempFiles(opts) {
    opts = opts || {};
    return [
      { name: 'readme', text: String(opts.readme == null ? '' : opts.readme) },
      { name: 'stack', text: packagesToStackFileText(opts.packages) },
      { name: 'notes', text: String(opts.notes == null ? '' : opts.notes) },
    ];
  }

  /** Find a temp_files entry by logical name (readme | stack | notes). */
  function tempFileEntry(tempFiles, name) {
    if (!Array.isArray(tempFiles)) return null;
    for (var i = 0; i < tempFiles.length; i++) {
      if (tempFiles[i] && tempFiles[i].name === name) return tempFiles[i];
    }
    return null;
  }

  global.packagesToStackFileText = packagesToStackFileText;
  global.packagesFromStackFile = packagesFromStackFile;
  global.buildRepoTempFiles = buildRepoTempFiles;
  global.tempFileEntry = tempFileEntry;

  global.runGitHubRepoDiscovery = runGitHubRepoDiscovery;
  global.DEFAULT_GITHUB_DISCOVERY_OPTIONS = {
    minStars: 5,
    excludeForks: true,
    inName: true,
    inDescription: true,
    inTopics: true,
    inReadme: false,
    includeCodeSearch: false,
    includeFileSearch: false,
    fileName: '',
    fileContains: '',
  };
})(typeof window !== 'undefined' ? window : globalThis);
