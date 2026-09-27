"""Behavioral smoke tests for the ported Claude helper scripts."""

import os
from pathlib import Path
import subprocess
import tempfile
from unittest import TestCase

ROOT = Path(__file__).resolve().parents[1]


class PortedScriptsTest(TestCase):
    def test_all_original_support_files_have_matching_hermes_paths(self):
        source = ROOT / ".claude/skills"
        target = ROOT / ".hermes/skills"
        copied = [path.relative_to(source) for path in source.rglob("*") if path.is_file() and path.name != "SKILL.md"]
        self.assertEqual(len(copied), 10)
        for relative in copied:
            with self.subTest(path=str(relative)):
                hermes_path = target / relative
                self.assertTrue(hermes_path.is_file())
                if relative.as_posix() != "resolve-reviews/scripts/get-pr-data.sh":
                    self.assertEqual(hermes_path.read_bytes(), (source / relative).read_bytes())

    def _stub(self, directory, name, content):
        path = directory / name
        path.write_text("#!/bin/bash\nset -e\n" + content)
        path.chmod(0o755)

    def test_review_collector_reads_all_pages_into_scratch(self):
        with tempfile.TemporaryDirectory(dir=os.environ["TMPDIR"]) as temp:
            root = Path(temp)
            bin_dir = root / "bin"
            bin_dir.mkdir()
            self._stub(
                bin_dir,
                "gh",
                'if [[ "$1" == "pr" && "$2" == "view" ]]; then\n'
                '  [[ " $* " == *" baseRefName "* ]] && echo main || echo 42\n'
                'elif [[ "$1" == "repo" ]]; then echo owner/repo\n'
                "else\n"
                "  printf '%s\\n' '[{\"id\":1,\"path\":\"a.ts\",\"line\":3,\"body\":\"first\",\"user\":{\"login\":\"alice\"}}]'\n"
                "  printf '%s\\n' '[{\"id\":2,\"path\":\"b.ts\",\"line\":8,\"body\":\"second\",\"user\":{\"login\":\"bob\"}}]'\n"
                "fi\n",
            )
            self._stub(bin_dir, "git", 'if [[ "$1" == "log" ]]; then echo "commit"; else echo "a.ts"; fi\n')
            env = {**os.environ, "TMPDIR": str(root), "PATH": f"{bin_dir}:{os.environ['PATH']}"}
            run = subprocess.run(
                ["bash", str(ROOT / ".hermes/skills/resolve-reviews/scripts/get-pr-data.sh")],
                cwd=ROOT,
                env=env,
                capture_output=True,
                text=True,
                check=True,
            )
            out_dir = Path(next(line.removeprefix("Output directory: ") for line in run.stdout.splitlines() if line.startswith("Output directory: ")))
            self.assertEqual(out_dir.parent, root)
            self.assertIn("Comments: 2", run.stdout)
            self.assertIn('"id": 2', (out_dir / "pr_comments.json").read_text())
            self.assertEqual((out_dir / "pr_commits.txt").read_text().strip(), "commit")
            self.assertTrue((out_dir / "pr_changed_files.txt").is_file())
            self.assertTrue((out_dir / "pr_diff.txt").is_file())

    def test_pr_creation_preserves_missing_label_fallback(self):
        with tempfile.TemporaryDirectory(dir=os.environ["TMPDIR"]) as temp:
            root = Path(temp)
            bin_dir = root / "bin"
            bin_dir.mkdir()
            body = root / "PR_BODY.md"
            body.write_text("PR body\n")
            self._stub(bin_dir, "git", 'if [[ "$1" == "branch" ]]; then echo feature/my; else exit 1; fi\n')
            self._stub(
                bin_dir,
                "gh",
                'if [[ "$1" == "repo" ]]; then echo main\n'
                'elif [[ "$1" == "label" ]]; then echo other-label\n'
                'elif [[ "$1" == "pr" && "$2" == "create" ]]; then printf "%s\\n" "$@" > "$TMPDIR/create-args"; echo https://example.test/1\n'
                "fi\n",
            )
            env = {**os.environ, "TMPDIR": str(root), "PATH": f"{bin_dir}:{os.environ['PATH']}"}
            run = subprocess.run(
                ["bash", str(ROOT / ".hermes/skills/write-pr/scripts/create-pr.sh"), "[auth] 테스트", str(body), "missing-label"],
                cwd=ROOT,
                env=env,
                capture_output=True,
                text=True,
                check=True,
            )
            args = (root / "create-args").read_text().splitlines()
            self.assertIn("main", args)
            self.assertNotIn("--label", args)
            self.assertIn("https://example.test/1", run.stdout)
            self.assertIn("without a label", run.stderr)
