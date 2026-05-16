/**
 * Shared GitHub repository + code discovery for index.html and project.html.
 * Expects caller to pass ghFetch (authenticated) and sleep(ms).
 */
(function (global) {
  'use strict';

  var REPO_PER_PAGE = 30;
  var CODE_PER_PAGE = 30;
  var REPO_PAGE_SLEEP_MS = 120;
  var CODE_PAGE_SLEEP_MS = 850;
  var README_VERIFY_SLEEP_MS = 90;
  var MAX_REPO_SEARCH_PAGES = 34;

  /**
   * Multi-word keywords are sent as GitHub phrase queries ("a b") so matches align
   * with a contiguous phrase in name/description/topics/readme. Single words unchanged.
   * Already-quoted strings and any keyword containing " are left as-is.
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
    if (opt.minStars > 0) q += ' stars:>' + opt.minStars;
    if (opt.excludeForks) q += ' fork:false';
    return q;
  }

  function buildCodeSearchQuery(kw, langs) {
    var q = phraseSearchTermForGitHub(kw);
    if (!q) return null;
    if (langs && langs.length) q += ' ' + langs.map(function (l) { return 'language:' + l; }).join(' ');
    return q;
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

  function codeRepositoryToItem(repo) {
    if (!repo || repo.id == null) return null;
    return fullRepoToSearchItem(repo);
  }

  function passesStarForkFilter(item, opt) {
    if (opt.excludeForks && item.fork) return false;
    var stars = item.stargazers_count;
    if (opt.minStars > 0) {
      if (stars == null || stars <= opt.minStars) return false;
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
   */
  function validateDiscoveryOptions(opt) {
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
    if (opt.minStars > 0) bits.push('stars>' + opt.minStars);
    if (opt.excludeForks) bits.push('exclude forks');
    return bits.join(' · ');
  }

  function discoveryContextDetail(kw, kwIndex, kwTotal, langs, opt) {
    var fields = repoFieldsLabel(opt);
    var langPart = langs && langs.length ? 'Languages: ' + langs.join(', ') : 'Languages: any';
    var filt = discoveryFiltersSummary(opt);
    var tail = filt ? ' · ' + filt : '';
    return (
      'Keyword ' +
      (kwIndex + 1) +
      '/' +
      kwTotal +
      ': ' +
      kw +
      ' · GitHub in: ' +
      (fields || '—') +
      ' · ' +
      langPart +
      tail
    );
  }

  /**
   * @param {object} params
   * @param {string[]} params.keywords
   * @param {string[]} params.langs
   * @param {number} params.maxResults
   * @param {object} params.options — discovery only (not extractPackages)
   * @param {function(string): Promise<any>} params.ghFetch
   * @param {function(number): Promise<void>} params.sleep
   * @param {function(number, string): void} params.onProgress
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

    validateDiscoveryOptions(opt);

    var seenIds = new Set();
    var repos = [];
    var anyRepoScope = opt.inName || opt.inDescription || opt.inTopics || opt.inReadme;
    var readmeOnly = readmeOnlyScope(opt);

    if (anyRepoScope && readmeOnly) {
      var verifiedIds = new Set();
      for (var vki = 0; vki < kws.length && repos.length < maxResults; vki++) {
        var vkw = kws[vki];
        var vq = buildRepoSearchQuery(vkw, langs, opt);
        if (!vq) continue;
        onProgress(
          5 + Math.round((vki / kws.length) * 35),
          'Repository search — README phrase verify',
          discoveryContextDetail(vkw, vki, kws.length, langs, opt) +
            ' · README body must contain the phrase (API metadata is not enough)'
        );
        pageLoop: for (var vpage = 1; vpage <= MAX_REPO_SEARCH_PAGES && repos.length < maxResults; vpage++) {
          try {
            var vurl =
              'https://api.github.com/search/repositories?q=' +
              encodeURIComponent(vq) +
              '&sort=stars&order=desc&per_page=' +
              REPO_PER_PAGE +
              '&page=' +
              vpage;
            var vdata = await ghFetch(vurl);
            var vitems = vdata.items || [];
            if (!vitems.length) break pageLoop;
            for (var vi = 0; vi < vitems.length && repos.length < maxResults; vi++) {
              var vr = vitems[vi];
              if (vr.fork || verifiedIds.has(vr.id)) continue;
              if (!passesStarForkFilter(vr, opt)) continue;
              onProgress(
                8 + Math.round((vki / kws.length) * 32),
                'README check: ' + vr.full_name,
                'Keyword: ' + vkw + ' · kept ' + repos.length + '/' + maxResults + ' so far'
              );
              var rtext = await fetchReadmeTextDecoded(vr.full_name, ghFetch);
              await sleep(README_VERIFY_SLEEP_MS);
              if (!readmeContainsKeywordPhrase(rtext, vkw)) continue;
              verifiedIds.add(vr.id);
              seenIds.add(vr.id);
              var vrWithReadme = Object.assign({}, vr, {
                readme: rtext || '',
                readme_fetched: true,
              });
              repos.push(vrWithReadme);
            }
            await sleep(REPO_PAGE_SLEEP_MS);
            if (vitems.length < REPO_PER_PAGE) break pageLoop;
          } catch (e) {
            if (e.message && e.message.indexOf('422') !== -1) break pageLoop;
            throw e;
          }
        }
      }
    } else if (anyRepoScope) {
      var budgetPerKw = Math.max(1, Math.ceil(maxResults / kws.length / REPO_PER_PAGE));
      for (var ki = 0; ki < kws.length && repos.length < maxResults; ki++) {
        var kw = kws[ki];
        var q = buildRepoSearchQuery(kw, langs, opt);
        if (!q) continue;
        onProgress(
          5 + Math.round((ki / kws.length) * 40),
          'Repository search (metadata)',
          discoveryContextDetail(kw, ki, kws.length, langs, opt)
        );
        for (var page = 1; page <= budgetPerKw && repos.length < maxResults; page++) {
          try {
            var url =
              'https://api.github.com/search/repositories?q=' +
              encodeURIComponent(q) +
              '&sort=stars&order=desc&per_page=' +
              REPO_PER_PAGE +
              '&page=' +
              page;
            var data = await ghFetch(url);
            var added = 0;
            for (var ri = 0; ri < (data.items || []).length; ri++) {
              var r = data.items[ri];
              if (!seenIds.has(r.id) && !r.fork) {
                seenIds.add(r.id);
                repos.push(r);
                added++;
              }
            }
            var denom = kws.length * budgetPerKw;
            var pct = 5 + Math.round(((ki * budgetPerKw + page) / denom) * 40);
            onProgress(
              pct,
              'Repository search · page ' + page,
              '"' + kw + '" · +' + added + ' new this page · ' + repos.length + '/' + maxResults + ' total'
            );
            await sleep(REPO_PAGE_SLEEP_MS);
          } catch (e) {
            if (e.message && e.message.indexOf('422') !== -1) break;
            throw e;
          }
        }
      }
    }

    if (!opt.includeCodeSearch || repos.length >= maxResults) {
      return repos.slice(0, maxResults);
    }

    onProgress(
      43,
      'Code search — extra pass',
      'Only ' +
        repos.length +
        '/' +
        maxResults +
        ' repos from repository search; scanning source files per keyword until quota or pages run out'
    );

    var budgetCodePerKw = Math.max(1, Math.ceil(maxResults / kws.length / CODE_PER_PAGE));
    for (var cki = 0; cki < kws.length && repos.length < maxResults; cki++) {
      var ckw = kws[cki];
      var cq = buildCodeSearchQuery(ckw, langs);
      if (!cq) continue;
      onProgress(
        45 + Math.round((cki / kws.length) * 35),
        'Code search',
        discoveryContextDetail(ckw, cki, kws.length, langs, opt) + ' · matches file contents (not just repo metadata)'
      );
      for (var cpage = 1; cpage <= budgetCodePerKw && repos.length < maxResults; cpage++) {
        try {
          var curl =
            'https://api.github.com/search/code?q=' +
            encodeURIComponent(cq) +
            '&per_page=' +
            CODE_PER_PAGE +
            '&page=' +
            cpage;
          var cdata = await ghFetch(curl);
          var cadded = 0;
          for (var ci = 0; ci < (cdata.items || []).length; ci++) {
            var item = cdata.items[ci];
            var crepo = item.repository;
            if (!crepo || crepo.id == null) continue;
            if (seenIds.has(crepo.id)) continue;
            var mapped = codeRepositoryToItem(crepo);
            if (!mapped) continue;
            if (mapped.stargazers_count == null || mapped.fork == null) {
              try {
                var segs = String(mapped.full_name || '')
                  .split('/')
                  .map(function (s) {
                    return encodeURIComponent(s);
                  })
                  .join('/');
                var full = await ghFetch('https://api.github.com/repos/' + segs);
                var merged = fullRepoToSearchItem(full);
                if (merged) mapped = merged;
              } catch (e) {
                /* keep partial */
              }
              await sleep(80);
            }
            if (!passesStarForkFilter(mapped, opt)) continue;
            if (seenIds.has(mapped.id)) continue;
            seenIds.add(mapped.id);
            repos.push(mapped);
            cadded++;
          }
          onProgress(
            45 + Math.round(((cki * budgetCodePerKw + cpage) / (kws.length * budgetCodePerKw)) * 35),
            'Code search · page ' + cpage,
            '"' + ckw + '" · +' + cadded + ' new this page · ' + repos.length + '/' + maxResults + ' total'
          );
          await sleep(CODE_PAGE_SLEEP_MS);
        } catch (e) {
          if (e.message && (e.message.indexOf('422') !== -1 || e.message.indexOf('403') !== -1)) break;
          throw e;
        }
      }
    }

    return repos.slice(0, maxResults);
  }

  global.runGitHubRepoDiscovery = runGitHubRepoDiscovery;
  global.DEFAULT_GITHUB_DISCOVERY_OPTIONS = {
    minStars: 5,
    excludeForks: true,
    inName: true,
    inDescription: true,
    inTopics: true,
    inReadme: false,
    includeCodeSearch: false,
  };
})(typeof window !== 'undefined' ? window : globalThis);
