// This is a fixture file for collect-inline-tasks tests.
// It contains diverse ai_todo styles to exercise the skill.
// The test runner saves and restores this file so tests are repeatable.

// ai_todo: "fix login validation to reject empty passwords" @ai @today

function login(user, password) {
  return user && password;
}

// ai_todo: "refactor auth logic to use middleware" @andrei @week

function register(email) {
  // ai_todo: "add input validation for email format" @ai @c
  return { email };
}

/* ai_todo: "migrate config to YAML format for readability" @ai */

# ai_todo: "add rate limiting to API endpoints" @ai @high

ai_todo: "raw style task without comment prefix" @andrei @today

// ai_todo: "Create new architecture plan:"
// 1) Create picture of db schema
// 2) Create view on API structure
// 3) This is multiline continuation of the same todo
