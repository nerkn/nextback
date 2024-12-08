import { Logger, ParamsType, QueryResult } from "../types";




  // Helper function to parse conditions recursively
  const parseCondition = (condition: string, params:ParamsType): string => {
    let result = "";
    let nestedLevel = 0;
    let currentPart = "";

    for (let i = 0; i < condition.length; i++) {
      const char = condition[i];

      if (char === "(") {
        if (nestedLevel > 0) currentPart += char;
        nestedLevel++;
      } else if (char === ")") {
        nestedLevel--;
        if (nestedLevel > 0) {
          currentPart += char;
        } else {
          result += `(${parseCondition(currentPart, params)})`;
          currentPart = "";
        }
      } else if (nestedLevel > 0) {
        currentPart += char;
      } else {
        result += char;
      }
    }

    if (nestedLevel !== 0) return ""; // Unbalanced parentheses check

    // Process OR conditions
    const orConditions = result.split(/\s*\|\|\s*/).map((orCondition) => {
      // Process AND conditions
      const andConditions = orCondition.split(/\s*&&\s*/).map((cond) => {
        const match = cond.match(/(\w+)\s*(>|<|=|like|in)\s*(.*)/i);
        if (!match) return false;

        let [, field, operator, value] = match;
        operator = operator.toLowerCase();

        // Handle different operators and value formats
        switch (operator) {
          case "like":
            value = value.replace(/['"]/g, "").trim(); // Remove quotes from value
            value = `%${value}%`; // Add % for LIKE queries
            break;
          case "in":
            value = value
              .replace(/[\(\)]/g, "")
              .split(",")
              .map((v) => v.trim()).join(",");
            break;
          case "=":
          case ">":
          case "<":
            value = value.replace(/['"]/g, "").trim(); // Remove quotes from value
            break;
          default:
            return false;
        }

        params.push(value);
        return `\`${field}\` ${operator} ?`;
      });
      return andConditions.includes(false) ? "" : andConditions.join(" AND ");
    });

    return orConditions.filter(Boolean).join(" OR ");
  };

export function getWhere(logger:Logger, whereParam: string): QueryResult {
  // Check for invalid characters that are not part of the expected query syntax
  const invalidCharacters = whereParam.replace(/(\w|,|\||\s|-|>|<|=|%|'|"|\(|\))*/g, "");
  if (invalidCharacters) {
    logger("error in where", whereParam, invalidCharacters);
    return ['',[]];
  }

  let query = "";
  const params:ParamsType = [];
  query = parseCondition(whereParam, params);
  if (!query) return ['',[]];

  return [query, params];
}
