export const TOKEN_TAIL =
    /[A-Za-z_$][\w$]*|\d[\w.]*|"[^"]*"?|'[^']*'?|`[^`]*`?|[^\s\w]/.source;

/** Comment syntaxes per language, tried before ordinary tokens. */
export const LINE_COMMENT: Record<string, string[]> = {
    javascript: ["//"],
    typescript: ["//"],
    rust: ["//"],
    go: ["//"],
    java: ["//"],
    c: ["//"],
    cpp: ["//"],
    css: [], // no line comments; block /* */ handled below
    python: ["#"],
    sql: ["--"],
    html: [],
};

/** Languages that support C-style /* ... *​/ block comments. */
export const BLOCK_COMMENT = new Set([
    "javascript",
    "typescript",
    "rust",
    "go",
    "java",
    "c",
    "cpp",
    "css",
    "sql",
]);

export const KEYWORDS: Record<string, ReadonlySet<string>> = {
    javascript: new Set(["as", "async", "await", "break", "case", "catch", "class", "const", "continue", "debugger", "default", "delete", "do", "else", "export", "extends", "finally", "for", "from", "function", "get", "if", "import", "in", "instanceof", "let", "new", "of", "return", "set", "static", "super", "switch", "throw", "try", "typeof", "var", "void", "while", "with", "yield"]),
    typescript: new Set(["abstract", "any", "as", "asserts", "async", "await", "boolean", "break", "case", "catch", "class", "const", "continue", "declare", "default", "delete", "do", "else", "enum", "export", "extends", "false", "finally", "for", "from", "function", "get", "if", "implements", "import", "in", "infer", "instanceof", "interface", "is", "keyof", "let", "namespace", "never", "new", "null", "number", "of", "private", "protected", "public", "readonly", "return", "set", "static", "string", "super", "switch", "symbol", "this", "throw", "true", "try", "type", "typeof", "undefined", "unique", "unknown", "var", "void", "while", "with", "yield"]),
    python: new Set(["and", "as", "assert", "async", "await", "break", "case", "class", "continue", "def", "del", "elif", "else", "except", "False", "finally", "for", "from", "global", "if", "import", "in", "is", "lambda", "match", "None", "nonlocal", "not", "or", "pass", "raise", "return", "True", "try", "while", "with", "yield"]),
    rust: new Set(["as", "async", "await", "break", "const", "continue", "crate", "dyn", "else", "enum", "extern", "false", "fn", "for", "if", "impl", "in", "let", "loop", "match", "mod", "move", "mut", "pub", "ref", "return", "self", "Self", "static", "struct", "super", "trait", "true", "type", "unsafe", "use", "where", "while"]),
    go: new Set(["break", "case", "chan", "const", "continue", "default", "defer", "else", "fallthrough", "for", "func", "go", "goto", "if", "import", "interface", "map", "package", "range", "return", "select", "struct", "switch", "type", "var"]),
    java: new Set(["abstract", "assert", "boolean", "break", "byte", "case", "catch", "char", "class", "const", "continue", "default", "do", "double", "else", "enum", "extends", "final", "finally", "float", "for", "if", "implements", "import", "instanceof", "int", "interface", "long", "new", "package", "private", "protected", "public", "return", "short", "static", "strictfp", "super", "switch", "synchronized", "this", "throw", "throws", "transient", "try", "void", "volatile", "while"]),
    c: new Set(["auto", "break", "case", "char", "const", "continue", "default", "do", "double", "else", "enum", "extern", "float", "for", "goto", "if", "inline", "int", "long", "register", "restrict", "return", "short", "signed", "sizeof", "static", "struct", "switch", "typedef", "union", "unsigned", "void", "volatile", "while"]),
    cpp: new Set(["alignas", "auto", "bool", "break", "case", "catch", "char", "class", "const", "constexpr", "continue", "decltype", "default", "delete", "do", "double", "else", "enum", "explicit", "export", "extern", "float", "for", "friend", "if", "inline", "int", "long", "mutable", "namespace", "new", "noexcept", "nullptr", "operator", "private", "protected", "public", "register", "return", "short", "signed", "sizeof", "static", "struct", "switch", "template", "this", "throw", "try", "typedef", "typename", "union", "unsigned", "using", "virtual", "void", "volatile", "while"]),
    sql: new Set(["ADD", "ALL", "ALTER", "AND", "AS", "ASC", "BEGIN", "BETWEEN", "BY", "CASE", "CREATE", "DELETE", "DESC", "DISTINCT", "DROP", "ELSE", "END", "EXISTS", "FROM", "GROUP", "HAVING", "IN", "INDEX", "INNER", "INSERT", "INTO", "JOIN", "LEFT", "LIKE", "LIMIT", "NOT", "NULL", "ON", "OR", "ORDER", "OUTER", "PRIMARY", "RIGHT", "SELECT", "SET", "TABLE", "THEN", "UNION", "UPDATE", "VALUES", "WHEN", "WHERE"]),
};

export const STRING_LITERAL =
    /^(?:"(?:\\.|[^"\\])*"?|\'(?:\\.|[^\'\\])*\'?|`(?:\\.|[^`\\])*`?)$/;
export const NUMBER_LITERAL = /^(?:0[xob][0-9a-f_]+|\d[\w.]*)$/i;
export const PUNCTUATION = /^[()[\]{},;:]$/;
export const OPERATOR = /^[^\s\w]$/;

export const SUPPORTED_LANGUAGES = new Set(Object.keys(LINE_COMMENT));

