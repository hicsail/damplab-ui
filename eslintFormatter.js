import chalk from "chalk";
import path from "path";

export default function(results) {
  const projectRoot = process.cwd();
  let totalFormattingErrors = 0;
  let totalLogicalErrors = 0;
  let output = "";

  results.forEach(file => {
    let fileFormattingErrors = 0;
    let fileLogicalErrors = 0;

    file.messages.forEach(msg => {
      if (msg.ruleId === "prettier/prettier") {
        fileFormattingErrors++;
      } else {
        fileLogicalErrors++;
      }
    });

    if (fileFormattingErrors || fileLogicalErrors) {
      const relativePath = path.relative(projectRoot, file.filePath);
      output += `\nFile: ${chalk.cyan(relativePath)}\n`;
      if (fileFormattingErrors) {
        output += `  Formatting Issues: ${chalk.yellow(fileFormattingErrors)}\n`;
      }
      if (fileLogicalErrors) {
        output += `  Logical Errors: ${chalk.red(fileLogicalErrors)}\n`;
      }
    }

    totalFormattingErrors += fileFormattingErrors;
    totalLogicalErrors += fileLogicalErrors;
  });

  output += `\n====== TOTAL ======\n`;
  output += `${chalk.yellow(`Formatting Issues: ${totalFormattingErrors}`)}\n`;
  output += `${chalk.red(`Logical Errors: ${totalLogicalErrors}`)}\n`;

  return output;
}