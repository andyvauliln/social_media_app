<div align="center">

# Claude Code Output Styles

[![MIT License](https://img.shields.io/github/license/nattergabriel/claude-code-output-styles)](LICENSE)
[![Styles](https://img.shields.io/badge/styles-13-blue)](#styles)

A curated collection of custom [output styles](https://code.claude.com/docs/en/output-styles) for [Claude Code](https://code.claude.com/docs)

</div>

---

Output styles change how Claude Code behaves by modifying its system prompt. They let you adapt Claude Code for different workflows, from adversarial code review to minimalist coding to explaining things like you're five.

<p align="center">
  <img src=".github/demo.png" alt="Comparison of Default vs Socratic output style in Claude Code" />
</p>

## Styles

- **[Breaker](output-styles/breaker.md):** Adversarial tester that tries to break everything you build.
- **[Challenger](output-styles/challenger.md):** Challenges every decision and stress-tests your designs before you commit.
- **[Concise](output-styles/concise.md):** Talks less, gets to the point, no filler in responses.
- **[Minimal](output-styles/minimal.md):** Writes the least code possible, removes everything unnecessary.
- **[Opinionated](output-styles/opinionated.md):** Has strong opinions about everything in your code.
- **[Paranoid](output-styles/paranoid.md):** Security-obsessed, every input is hostile and every dependency is suspect.
- **[Performance](output-styles/performance.md):** Obsessed with speed and efficiency, profiles and benchmarks everything.
- **[Roast](output-styles/roast.md):** Brutally honest code critique that drags your code, then helps you fix it.
- **[Ship It](output-styles/ship-it.md):** Aggressively pragmatic, shortest path to working software.
- **[Simple](output-styles/simple.md):** Explains everything like you're five, no jargon, all metaphors.
- **[Socratic](output-styles/socratic.md):** Guides you to the answer through questions instead of giving it directly.
- **[TDD](output-styles/tdd.md):** Test-driven development, always writes tests first.
- **[Think Aloud](output-styles/think-aloud.md):** Reflects your thinking back and helps you debug by talking it out.

## Installation

Copy or symlink a style file into one of these directories:

```sh
# User-level
~/.claude/output-styles/

# Project-level
.claude/output-styles/
```

Then select it through `/config` > **Output style**:

<p align="center">
  <img src=".github/screenshot.png" alt="Output style picker in Claude Code" />
</p>

Or set it directly in your settings:

```json
{
  "outputStyle": "Roast"
}
```

## Contributing

Contributions are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for the style file format, writing guidelines, and how to submit a pull request.

## License

MIT
