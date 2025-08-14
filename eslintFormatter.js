import chalk from "chalk";
import path from "path";

export default function(results) {
  const projectRoot = process.cwd();
  let totalFormattingErrors = 0;
  let totalErrors = 0;
  let output = "";

  results.forEach(file => {
    let fileFormattingErrors = 0;
    let fileErrors = 0;
    let errorMessages = "";

    file.messages.forEach(msg => {
      if (msg.ruleId === "prettier/prettier") {
        fileFormattingErrors++;
      } else {
        fileErrors++;
        errorMessages += `  - ${chalk.gray(`${msg.line}:${msg.column}`)} ${chalk.red(msg.message)} (${msg.ruleId || "no rule"})\n`;
      }
    });

    if (fileFormattingErrors || fileErrors) {
      const relativePath = path.relative(projectRoot, file.filePath);
      output += `\nFile: ${chalk.cyan(relativePath)}\n`;
      if (fileFormattingErrors) {
        output += ` ‣ Formatting Issues: ${chalk.yellow(fileFormattingErrors)}\n`;
      }
      if (fileErrors) {
        output += ` ‣ ${chalk.red(fileErrors)} Error(s):\n`;
        output += errorMessages;
      }
    }

    totalFormattingErrors += fileFormattingErrors;
    totalErrors += fileErrors;
  });

  if (totalFormattingErrors > 0 || totalErrors > 0) {
  output += `\n${chalk.bold(`· · ────── Total ────── · ·`)}\n` +
    chalk.yellow(`⚠︎ Formatting Issues: ${totalFormattingErrors}\n`) +
    chalk.red(`✖ Errors: ${totalErrors}\n`) +
    chalk.gray("\n(To get more details run `lint:full`)\n");
  } else {
    output += chalk.green("\n✔ All tests passed!\n");
  }

  return output;
}