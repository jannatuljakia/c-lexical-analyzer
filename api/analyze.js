const KEYWORDS = new Set([
  "auto","break","case","char","const","continue","default","do",
  "double","else","enum","extern","float","for","goto","if",
  "int","long","register","return","short","signed","sizeof","static",
  "struct","switch","typedef","union","unsigned","void","volatile","while"
]);

function lexer(code) {
  const result = {
    "Header Files": [], "Keywords": [], "Identifiers": [],
    "Operators": [], "Constants": [], "Symbols": [],
    "Strings": [], "Characters": [], "Invalid Identifiers": []
  };

  function add(cat, val) {
    if (!result[cat].includes(val)) result[cat].push(val);
  }

  let i = 0;
  while (i < code.length) {
    let c = code[i];

    // Whitespace
    if (/\s/.test(c)) { i++; continue; }

    // Header
    if (c === '#') {
      let j = i;
      while (i < code.length && code[i] !== '\n') i++;
      add("Header Files", code.slice(j, i).trim());
      continue;
    }

    // Single line comment
    if (c === '/' && code[i+1] === '/') {
      while (i < code.length && code[i] !== '\n') i++;
      continue;
    }

    // Multi line comment
    if (c === '/' && code[i+1] === '*') {
      i += 2;
      while (i < code.length && !(code[i-1] === '*' && code[i] === '/')) i++;
      i++;
      continue;
    }

    // String literal
    if (c === '"') {
      let j = i++; 
      while (i < code.length && code[i] !== '"') {
        if (code[i] === '\\') i++;
        i++;
      }
      i++;
      add("Strings", code.slice(j, i));
      continue;
    }

    // Char literal
    if (c === "'") {
      let j = i++;
      while (i < code.length && code[i] !== "'") {
        if (code[i] === '\\') i++;
        i++;
      }
      i++;
      add("Characters", code.slice(j, i));
      continue;
    }

    // Identifier / Keyword
    if (/[a-zA-Z_]/.test(c)) {
      let j = i;
      while (i < code.length && /[a-zA-Z0-9_]/.test(code[i])) i++;
      const word = code.slice(j, i);
      KEYWORDS.has(word) ? add("Keywords", word) : add("Identifiers", word);
      continue;
    }

    // Number
    if (/[0-9]/.test(c)) {
      let j = i, dots = 0, bad = false;
      while (i < code.length && /[0-9a-zA-Z._]/.test(code[i])) {
        if (/[a-zA-Z_]/.test(code[i])) bad = true;
        if (code[i] === '.') dots++;
        i++;
      }
      const num = code.slice(j, i);
      bad || dots > 1 ? add("Invalid Identifiers", num) : add("Constants", num);
      continue;
    }

    // Operators
    if (/[+\-*=<>!%&|]/.test(c)) {
      const two = code.slice(i, i+2);
      const twoOps = ["==","<=",">=","!=","++","--","+=","-=","*=","&&","||","&=","|=","->"];
      if (twoOps.includes(two)) {
        add("Operators", two); i += 2;
      } else if (c === '/' ) {
        add("Operators", '/'); i++;
      } else {
        add("Operators", c); i++;
      }
      continue;
    }

    // Division operator (standalone)
    if (c === '/') { add("Operators", '/'); i++; continue; }

    // Dot operator
    if (c === '.') { add("Operators", '.'); i++; continue; }

    // Symbols
    if (";(){}[],".includes(c)) { add("Symbols", c); i++; continue; }

    i++;
  }

  return result;
}

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST");

  if (req.method !== "POST") return res.status(405).end();

  let body = "";
  for await (const chunk of req) body += chunk;

  const tokens = lexer(body);
  let output = "";
  for (const [name, values] of Object.entries(tokens)) {
    if (!values.length) continue;
    const sep = name === "Symbols" ? " " : ", ";
    output += `${name}: ${values.join(sep)}\n`;
  }

  res.status(200).setHeader("Content-Type", "text/plain").end(output);
};