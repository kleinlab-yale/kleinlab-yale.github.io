import { mkdir, readFile, stat } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const toolDir = path.dirname(fileURLToPath(import.meta.url));
const projectDir = path.resolve(toolDir, "..");
const scriptPath = path.join(projectDir, "voice-script.json");
const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run");
const force = args.has("--force");

const defaultVoice = "Samantha";
const defaultRate = 180;

const hasAudioData = async (filePath) => {
  try {
    const { size } = await stat(filePath);
    return size > 4096;
  } catch (error) {
    return false;
  }
};

function run(command, commandArgs) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, commandArgs, { stdio: ["ignore", "pipe", "pipe"] });
    let stderr = "";

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`${command} exited with ${code}: ${stderr.trim()}`));
    });
  });
}

async function generateClip(clip) {
  const outputPath = path.join(projectDir, clip.file);
  const relativeOutput = path.relative(projectDir, outputPath);
  const voice = clip.localVoice || defaultVoice;
  const rate = String(clip.rate || defaultRate);

  if (!force && (await hasAudioData(outputPath))) {
    console.log(`skip ${relativeOutput} already exists`);
    return;
  }

  if (dryRun) {
    console.log(`dry-run ${relativeOutput} voice="${voice}" rate=${rate}`);
    return;
  }

  await mkdir(path.dirname(outputPath), { recursive: true });
  await run("/usr/bin/say", [
    "-v",
    voice,
    "-r",
    rate,
    "-o",
    outputPath,
    "--file-format=WAVE",
    "--data-format=LEI16",
    clip.text
  ]);

  const { size } = await stat(outputPath);
  if (size <= 4096) {
    throw new Error(
      `${relativeOutput} was created without audio data. Run this generator from a normal macOS Terminal or allow Codex to run it outside the sandbox.`
    );
  }

  console.log(`wrote ${relativeOutput} voice="${voice}" rate=${rate}`);
}

const sheet = JSON.parse(await readFile(scriptPath, "utf8"));

for (const clip of sheet.clips) {
  await generateClip(clip);
}

console.log("local voice generation complete");
