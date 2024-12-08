import { Logger } from "../types";

export function getOrderBy(logger:Logger, params: string): string | false {
    if (params.replace(/(\w|=|,|<|>|\s|%)*/g, "")) {
      logger("error in orderby", params);
      return false;
    }
    const orderbys = params.split(",").map((p) => {
      const sepop = p.search(/(=|<|>|%)/g);
      if (sepop < 0) return p;

      const part1 = p.substring(0, sepop);
      let part2 = p[sepop];
      let part3 = p.substring(sepop + 1);

      switch (p[sepop]) {
        case "%":
          part2 = " LIKE ";
          part3 = `"%${part3}%"`;
          break;
        default:
          part3 = `"${part3}"`;
      }
      return `${part1}${part2}${part3}`;
    });

    return orderbys.length ? "ORDER BY " + orderbys.join(", ") : false;
  }