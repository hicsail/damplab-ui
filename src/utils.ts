// This is only its own file because there used to be a UtilityContext, suggesting a desire/plan for a utils module;
// see the rest of this commit.

export const trunc = (str: string, n: number = 40): string =>
  str.length > n ? str.slice(0, n - 1) + "…" : str;
