"""Exercise release/rollback paths in isolated directories with fake Docker/curl."""
import os
from pathlib import Path
import subprocess
import tarfile
import tempfile
import unittest

OPS = Path(__file__).resolve().parent

@unittest.skipIf(os.name == "nt", "Run on Linux (CI or isolated server temp directory)")
class DeployTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.bin = self.root / "bin"
        self.bin.mkdir()
        self.env = dict(os.environ, PATH=str(self.bin) + os.pathsep + os.environ["PATH"],
                        DEPLOY_ROOT=str(self.root), DEPLOY_LOCK=str(self.root / "lock"),
                        TEST_ROOT=str(self.root))
        self.stub("sleep", "exit 0")
        self.stub("nginx", "exit 0")
        self.stub("docker", r'''echo "$*" >> "$TEST_ROOT/docker.log"
if [[ "$1 $2 $3" == "compose ps -q" ]]; then echo container; fi
if [[ "$1" == inspect ]]; then echo sha256:previous; fi
if [[ "$1" == pull && "${FAIL_PULL:-}" == 1 ]]; then exit 1; fi
if [[ "$*" == *" up -d "* ]]; then
  if grep -q ':rollback' "$TEST_ROOT"/*.release.yml; then touch "$TEST_ROOT/rolled-back"; fi
fi''')
        self.stub("curl", r'''if [[ "${FAIL_HEALTH:-}" == 1 && ! -e "$TEST_ROOT/rolled-back" ]]; then exit 22; fi
exit 0''')

    def stub(self, name, body):
        file = self.bin / name
        file.write_text("#!/usr/bin/env bash\n" + body + "\n")
        file.chmod(0o755)

    def container(self, **env):
        image = "995679261350.dkr.ecr.ap-southeast-2.amazonaws.com/properly-backend:" + "a" * 40
        return subprocess.run(["bash", str(OPS / "deploy-container.sh"), "backend", image],
                              env=dict(self.env, **env), capture_output=True, text=True)

    def test_commit_image_deploy(self):
        result = self.container()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("a" * 40, (self.root / "docker-compose.backend.release.yml").read_text())

    def test_unhealthy_image_restores_previous(self):
        result = self.container(FAIL_HEALTH="1")
        self.assertNotEqual(result.returncode, 0)
        self.assertTrue((self.root / "rolled-back").exists())
        self.assertIn(":rollback", (self.root / "docker-compose.backend.release.yml").read_text())

    def test_pull_failure_keeps_release(self):
        override = self.root / "docker-compose.backend.release.yml"
        override.write_text("original")
        result = self.container(FAIL_PULL="1")
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(override.read_text(), "original")
        self.assertNotIn("up -d", (self.root / "docker.log").read_text())

    def static(self, fail=False):
        live = self.root / "live"
        live.mkdir()
        (live / "index.html").write_text("previous")
        source = self.root / "source"
        source.mkdir()
        for name in ["index.html", "contact.html", "404.html"]:
            (source / name).write_text("new")
        archive = self.root / "site.tar.gz"
        with tarfile.open(archive, "w:gz") as tar:
            for file in source.iterdir():
                tar.add(file, arcname=file.name)
        env = dict(self.env, STATIC_ROOT=str(live), RELEASES_ROOT=str(self.root / "releases"),
                   FAIL_HEALTH="1" if fail else "0")
        result = subprocess.run(["bash", str(OPS / "deploy-static.sh"), str(archive), "a"*40+"-1-1"],
                                env=env, capture_output=True, text=True)
        return result, live

    def test_static_atomic_release(self):
        result, live = self.static()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertTrue(live.is_symlink())
        self.assertEqual((live / "index.html").read_text(), "new")

    def test_static_failure_restores_previous(self):
        result, live = self.static(fail=True)
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual((live / "index.html").read_text(), "previous")

if __name__ == "__main__":
    unittest.main()
