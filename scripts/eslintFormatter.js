import chalk from "chalk";
import path from "path";

export default function formatter(results) {
  const projectRoot = process.cwd();
  let totalErrors = 0;
  let totalWarnings = 0;
  let output = "";

  results.forEach(file => {
    let fileErrors = 0;
    let fileWarnings = 0;
    let errorMessages = "";
    let warningMessages = "";

    file.messages.forEach(msg => {
      const location = chalk.gray(`${msg.line}:${msg.column}`);
      const rule = chalk.dim(`(${msg.ruleId || "no rule"})`);

      if (msg.severity === 2) {
        fileErrors++;
        errorMessages += `  - ${location} ${chalk.red(msg.message)} ${rule}\n`;
      } else {
        fileWarnings++;
        warningMessages += `  - ${location} ${chalk.yellow(msg.message)} ${rule}\n`;
      }
    });

    if (fileErrors || fileWarnings) {
      const relativePath = path.relative(projectRoot, file.filePath);
      output += `\nFile: ${chalk.cyan(relativePath)}\n`;
      if (fileErrors) {
        output += ` ‣ ${chalk.red(fileErrors)} Error(s):\n${errorMessages}`;
      }
      if (fileWarnings) {
        output += ` ‣ ${chalk.yellow(fileWarnings)} Warning(s):\n${warningMessages}`;
      }
    }

    totalErrors += fileErrors;
    totalWarnings += fileWarnings;
  });

  const totalProblems = totalErrors + totalWarnings;
  if (totalProblems > 0) {
    output += `\n${chalk.red.bold("✖ ")}${totalProblems} problems ` +
              `(${chalk.red(`${totalErrors} errors`)}, ` +
              `${chalk.yellow(`${totalWarnings} warnings`)})\n`;
  } else {
    output += chalk.green("\n✔ No problems found!\n");
  }

  return output;
}