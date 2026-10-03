// commitlint: memeriksa format pesan commit (Conventional Commits). release-please
// menentukan versi dan changelog dari pesan commit di main, jadi formatnya harus
// benar sebelum di-merge. Dijalankan hook .husky/commit-msg (lokal, terpasang
// lewat skrip "prepare" saat npm install) dan step "Commit message" di ci.yml.
export default {
  extends: ["@commitlint/config-conventional"],
  // Commit Dependabot: judulnya sudah Conventional (prefix di .github/dependabot.yml),
  // tapi body-nya berisi baris release notes/URL yang lebih dari 100 karakter.
  ignores: [(message) => /^Signed-off-by: dependabot\[bot\]/m.test(message)],
};
