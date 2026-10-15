import { csvCell } from "./csv";

test.each(["=1+1", "+SUM(A1:A2)", "-CMD()", "@SUM(1,1)", "\t=1+1"])("neutralizes formula-like text %s", (value) => {
  expect(csvCell(value)).toBe(`"'${value.replace(/"/g, '""')}"`);
});

test("keeps finite numeric values as numbers and escapes quotes in text", () => {
  expect(csvCell(-12)).toBe('"-12"');
  expect(csvCell('A "quoted" name')).toBe('"A ""quoted"" name"');
});
