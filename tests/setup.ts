// Runs before test files: point every test at the isolated test database
// and force notifications off (unit tests for the mailer opt in explicitly).
process.env["DATABASE_URL"] =
  process.env["TEST_DATABASE_URL"] ??
  "postgresql://tickets:tickets_dev@localhost:5433/tickets_test?schema=public";
process.env["RESEND_API_KEY"] = "";
