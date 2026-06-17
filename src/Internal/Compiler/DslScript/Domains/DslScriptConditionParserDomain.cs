using System;
using System.Collections.Generic;
using System.Globalization;
using Inscape.Compiler.Diagnostics;
using Inscape.Compiler.Model;

namespace Inscape.Compiler.Parsing {

    public sealed class DslScriptConditionParserDomain {

        public DslScriptConditionModel Parse(string raw,
                                             string sourcePath,
                                             int lineNumber,
                                             int column,
                                             List<DiagnosticModel> diagnostics) {
            int leading = CountLeadingWhitespace(raw);
            int trailing = CountTrailingWhitespace(raw);
            int length = raw.Length - leading - trailing;
            string expressionText = length <= 0 ? string.Empty : raw.Substring(leading, length);
            int expressionColumn = column + leading;

            DslScriptConditionModel condition = new DslScriptConditionModel();
            condition.Raw = expressionText;
            condition.Source = new SourceSpanModel(sourcePath, lineNumber, expressionColumn);

            if (expressionText.Length == 0) {
                diagnostics.Add(new DiagnosticModel("INS050",
                                               DiagnosticSeverityModel.Error,
                                               "Condition expression cannot be empty.",
                                               sourcePath,
                                               lineNumber,
                                               column));
                return condition;
            }

            ConditionParser parser = new ConditionParser(expressionText, sourcePath, lineNumber, expressionColumn, diagnostics);
            condition.Expression = parser.ParseExpression();
            parser.ReportTrailingTokens();
            return condition;
        }

        static int CountLeadingWhitespace(string text) {
            for (int i = 0; i < text.Length; i += 1) {
                if (!char.IsWhiteSpace(text[i])) {
                    return i;
                }
            }

            return text.Length;
        }

        static int CountTrailingWhitespace(string text) {
            int count = 0;
            for (int i = text.Length - 1; i >= 0; i -= 1) {
                if (!char.IsWhiteSpace(text[i])) {
                    return count;
                }

                count += 1;
            }

            return count;
        }

        sealed class ConditionParser {

            readonly string text;
            readonly string sourcePath;
            readonly int lineNumber;
            readonly int baseColumn;
            readonly List<DiagnosticModel> diagnostics;
            readonly List<ConditionToken> tokens;
            int index;

            public ConditionParser(string text,
                                   string sourcePath,
                                   int lineNumber,
                                   int baseColumn,
                                   List<DiagnosticModel> diagnostics) {
                this.text = text;
                this.sourcePath = sourcePath;
                this.lineNumber = lineNumber;
                this.baseColumn = baseColumn;
                this.diagnostics = diagnostics;
                tokens = Tokenize();
            }

            public DslScriptConditionExpressionModel? ParseExpression() {
                return ParseOr();
            }

            public void ReportTrailingTokens() {
                ConditionToken token = Current();
                if (token.Kind == ConditionTokenKind.End) {
                    return;
                }

                diagnostics.Add(new DiagnosticModel("INS052",
                                               DiagnosticSeverityModel.Error,
                                               "Unexpected trailing token '" + token.Raw + "' in condition expression.",
                                               sourcePath,
                                               lineNumber,
                                               token.Column));
            }

            DslScriptConditionExpressionModel? ParseOr() {
                DslScriptConditionExpressionModel? left = ParseAnd();
                while (Current().Kind == ConditionTokenKind.Or) {
                    ConditionToken op = Advance();
                    DslScriptConditionExpressionModel? right = ParseAnd();
                    left = CreateBinary(DslScriptConditionExpressionKindModel.Binary, op, left, right);
                }

                return left;
            }

            DslScriptConditionExpressionModel? ParseAnd() {
                DslScriptConditionExpressionModel? left = ParseNot();
                while (Current().Kind == ConditionTokenKind.And) {
                    ConditionToken op = Advance();
                    DslScriptConditionExpressionModel? right = ParseNot();
                    left = CreateBinary(DslScriptConditionExpressionKindModel.Binary, op, left, right);
                }

                return left;
            }

            DslScriptConditionExpressionModel? ParseNot() {
                if (Current().Kind != ConditionTokenKind.Not) {
                    return ParseComparison();
                }

                ConditionToken op = Advance();
                DslScriptConditionExpressionModel? operand = ParseNot();
                if (operand == null) {
                    return null;
                }

                DslScriptConditionExpressionModel expression = new DslScriptConditionExpressionModel();
                expression.Kind = DslScriptConditionExpressionKindModel.Unary;
                expression.Operator = op.Raw;
                expression.Operand = operand;
                expression.Raw = op.Raw + " " + operand.Raw;
                expression.Source = new SourceSpanModel(sourcePath, lineNumber, op.Column);
                return expression;
            }

            DslScriptConditionExpressionModel? ParseComparison() {
                DslScriptConditionExpressionModel? left = ParsePrimary();
                ConditionToken token = Current();
                if (!IsComparison(token.Kind)) {
                    return left;
                }

                ConditionToken op = Advance();
                DslScriptConditionExpressionModel? right = ParsePrimary();
                return CreateBinary(DslScriptConditionExpressionKindModel.Comparison, op, left, right);
            }

            DslScriptConditionExpressionModel? ParsePrimary() {
                ConditionToken token = Current();
                switch (token.Kind) {
                    case ConditionTokenKind.String:
                    case ConditionTokenKind.Number:
                    case ConditionTokenKind.Bool:
                        Advance();
                        return CreateLiteralExpression(CreateLiteral(token));

                    case ConditionTokenKind.Identifier:
                        return ParseQueryOrIdentifier();

                    case ConditionTokenKind.LeftParen:
                        return ParseParenthesized();

                    case ConditionTokenKind.UnsupportedArray:
                    case ConditionTokenKind.UnsupportedAction:
                    case ConditionTokenKind.UnsupportedAssignment:
                    case ConditionTokenKind.UnsupportedOperator:
                        Advance();
                        return null;

                    case ConditionTokenKind.End:
                        diagnostics.Add(new DiagnosticModel("INS052",
                                                       DiagnosticSeverityModel.Error,
                                                       "Unexpected end of condition expression.",
                                                       sourcePath,
                                                       lineNumber,
                                                       token.Column));
                        return null;

                    default:
                        diagnostics.Add(new DiagnosticModel("INS052",
                                                       DiagnosticSeverityModel.Error,
                                                       "Unexpected token '" + token.Raw + "' in condition expression.",
                                                       sourcePath,
                                                       lineNumber,
                                                       token.Column));
                        Advance();
                        return null;
                }
            }

            DslScriptConditionExpressionModel? ParseParenthesized() {
                Advance();
                DslScriptConditionExpressionModel? expression = ParseOr();
                ConditionToken current = Current();
                if (current.Kind != ConditionTokenKind.RightParen) {
                    diagnostics.Add(new DiagnosticModel("INS052",
                                                   DiagnosticSeverityModel.Error,
                                                   "Expected ')' to close condition group.",
                                                   sourcePath,
                                                   lineNumber,
                                                   current.Column));
                    return expression;
                }

                Advance();
                return expression;
            }

            DslScriptConditionExpressionModel ParseQueryOrIdentifier() {
                ConditionToken first = Advance();
                string name = first.Raw;
                while (Current().Kind == ConditionTokenKind.Dot) {
                    Advance();
                    ConditionToken part = Current();
                    if (part.Kind != ConditionTokenKind.Identifier) {
                        diagnostics.Add(new DiagnosticModel("INS052",
                                                       DiagnosticSeverityModel.Error,
                                                       "Expected identifier after '.'.",
                                                       sourcePath,
                                                       lineNumber,
                                                       part.Column));
                        break;
                    }

                    name += "." + Advance().Raw;
                }

                DslScriptConditionQueryModel query = new DslScriptConditionQueryModel();
                query.Name = name;
                query.Source = new SourceSpanModel(sourcePath, lineNumber, first.Column);

                if (Current().Kind == ConditionTokenKind.LeftParen) {
                    query.Syntax = DslScriptConditionQuerySyntaxModel.Call;
                    ParseArguments(query);
                } else {
                    query.Syntax = DslScriptConditionQuerySyntaxModel.Path;
                }

                DslScriptConditionExpressionModel expression = new DslScriptConditionExpressionModel();
                expression.Kind = DslScriptConditionExpressionKindModel.Query;
                expression.Query = query;
                expression.Raw = ReadRaw(first.Offset, Previous().EndOffset);
                expression.Source = query.Source;
                return expression;
            }

            void ParseArguments(DslScriptConditionQueryModel query) {
                Advance();
                if (Current().Kind == ConditionTokenKind.RightParen) {
                    Advance();
                    return;
                }

                while (Current().Kind != ConditionTokenKind.End) {
                    DslScriptConditionLiteralModel? argument = ParseArgumentLiteral();
                    if (argument != null) {
                        query.Arguments.Add(argument);
                    }

                    ConditionToken current = Current();
                    if (current.Kind == ConditionTokenKind.Comma) {
                        Advance();
                        continue;
                    }

                    if (current.Kind == ConditionTokenKind.RightParen) {
                        Advance();
                        return;
                    }

                    diagnostics.Add(new DiagnosticModel("INS052",
                                                   DiagnosticSeverityModel.Error,
                                                   "Expected ',' or ')' in query arguments.",
                                                   sourcePath,
                                                   lineNumber,
                                                   current.Column));
                    return;
                }

                diagnostics.Add(new DiagnosticModel("INS052",
                                               DiagnosticSeverityModel.Error,
                                               "Expected ')' to close query arguments.",
                                               sourcePath,
                                               lineNumber,
                                               Current().Column));
            }

            DslScriptConditionLiteralModel? ParseArgumentLiteral() {
                ConditionToken token = Current();
                switch (token.Kind) {
                    case ConditionTokenKind.String:
                    case ConditionTokenKind.Number:
                    case ConditionTokenKind.Bool:
                        Advance();
                        return CreateLiteral(token);

                    case ConditionTokenKind.Identifier:
                        ConditionToken identifier = Advance();
                        if (Current().Kind == ConditionTokenKind.LeftParen) {
                            diagnostics.Add(new DiagnosticModel("INS056",
                                                           DiagnosticSeverityModel.Error,
                                                           "Query call arguments must be literals.",
                                                           sourcePath,
                                                           lineNumber,
                                                           identifier.Column));
                            SkipUnsupportedArgument();
                            return null;
                        }

                        return CreateLiteral(identifier);

                    case ConditionTokenKind.UnsupportedArray:
                        Advance();
                        SkipUnsupportedArgument();
                        return null;

                    default:
                        diagnostics.Add(new DiagnosticModel("INS056",
                                                       DiagnosticSeverityModel.Error,
                                                       "Query call arguments must be string, number, bool, or identifier literals.",
                                                       sourcePath,
                                                       lineNumber,
                                                       token.Column));
                        Advance();
                        return null;
                }
            }

            void SkipUnsupportedArgument() {
                int depth = 0;
                while (Current().Kind != ConditionTokenKind.End) {
                    ConditionToken token = Current();
                    if (token.Kind == ConditionTokenKind.LeftParen) {
                        depth += 1;
                    } else if (token.Kind == ConditionTokenKind.RightParen) {
                        if (depth == 0) {
                            return;
                        }

                        depth -= 1;
                    } else if (depth == 0 && token.Kind == ConditionTokenKind.Comma) {
                        return;
                    }

                    Advance();
                }
            }

            DslScriptConditionExpressionModel? CreateBinary(DslScriptConditionExpressionKindModel kind,
                                                            ConditionToken op,
                                                            DslScriptConditionExpressionModel? left,
                                                            DslScriptConditionExpressionModel? right) {
                if (left == null || right == null) {
                    return left ?? right;
                }

                DslScriptConditionExpressionModel expression = new DslScriptConditionExpressionModel();
                expression.Kind = kind;
                expression.Operator = op.Raw;
                expression.Left = left;
                expression.Right = right;
                expression.Raw = left.Raw + " " + op.Raw + " " + right.Raw;
                expression.Source = left.Source;
                return expression;
            }

            DslScriptConditionExpressionModel CreateLiteralExpression(DslScriptConditionLiteralModel literal) {
                DslScriptConditionExpressionModel expression = new DslScriptConditionExpressionModel();
                expression.Kind = DslScriptConditionExpressionKindModel.Literal;
                expression.Literal = literal;
                expression.Raw = literal.Raw;
                expression.Source = literal.Source;
                return expression;
            }

            DslScriptConditionLiteralModel CreateLiteral(ConditionToken token) {
                DslScriptConditionLiteralModel literal = new DslScriptConditionLiteralModel();
                literal.Raw = token.Raw;
                literal.Source = new SourceSpanModel(sourcePath, lineNumber, token.Column);

                if (token.Kind == ConditionTokenKind.String) {
                    literal.LiteralKind = DslScriptConditionLiteralKindModel.String;
                    literal.StringValue = DecodeString(token.Raw);
                } else if (token.Kind == ConditionTokenKind.Number) {
                    literal.LiteralKind = DslScriptConditionLiteralKindModel.Number;
                    literal.NumberValue = double.Parse(token.Raw, CultureInfo.InvariantCulture);
                } else if (token.Kind == ConditionTokenKind.Bool) {
                    literal.LiteralKind = DslScriptConditionLiteralKindModel.Bool;
                    literal.BoolValue = string.Equals(token.Raw, "true", StringComparison.Ordinal);
                } else {
                    literal.LiteralKind = DslScriptConditionLiteralKindModel.Identifier;
                    literal.StringValue = token.Raw;
                }

                return literal;
            }

            static string DecodeString(string raw) {
                if (raw.Length < 2) {
                    return raw;
                }

                string inner = raw.Substring(1, raw.Length - 2);
                return inner.Replace("\\\"", "\"").Replace("\\\\", "\\");
            }

            static bool IsComparison(ConditionTokenKind kind) {
                return kind == ConditionTokenKind.Equal
                    || kind == ConditionTokenKind.NotEqual
                    || kind == ConditionTokenKind.Less
                    || kind == ConditionTokenKind.LessOrEqual
                    || kind == ConditionTokenKind.Greater
                    || kind == ConditionTokenKind.GreaterOrEqual;
            }

            ConditionToken Current() {
                return tokens[index];
            }

            ConditionToken Previous() {
                return tokens[Math.Max(0, index - 1)];
            }

            ConditionToken Advance() {
                ConditionToken token = tokens[index];
                if (index < tokens.Count - 1) {
                    index += 1;
                }

                return token;
            }

            string ReadRaw(int startOffset, int endOffset) {
                return text.Substring(startOffset, endOffset - startOffset);
            }

            List<ConditionToken> Tokenize() {
                List<ConditionToken> result = new List<ConditionToken>();
                int offset = 0;
                while (offset < text.Length) {
                    char current = text[offset];
                    if (char.IsWhiteSpace(current)) {
                        offset += 1;
                        continue;
                    }

                    if (IsIdentifierStart(current)) {
                        int start = offset;
                        offset += 1;
                        while (offset < text.Length && IsIdentifierPart(text[offset])) {
                            offset += 1;
                        }

                        string raw = text.Substring(start, offset - start);
                        ConditionTokenKind kind = raw switch {
                            "and" => ConditionTokenKind.And,
                            "or" => ConditionTokenKind.Or,
                            "not" => ConditionTokenKind.Not,
                            "true" => ConditionTokenKind.Bool,
                            "false" => ConditionTokenKind.Bool,
                            "await" => ConditionTokenKind.UnsupportedOperator,
                            _ => ConditionTokenKind.Identifier,
                        };
                        AddToken(result, kind, raw, start, offset);
                        if (kind == ConditionTokenKind.UnsupportedOperator) {
                            AddUnsupportedOperatorDiagnostic(raw, start);
                        }
                        continue;
                    }

                    if (char.IsDigit(current)) {
                        int start = offset;
                        offset += 1;
                        while (offset < text.Length && char.IsDigit(text[offset])) {
                            offset += 1;
                        }
                        if (offset < text.Length && text[offset] == '.') {
                            offset += 1;
                            while (offset < text.Length && char.IsDigit(text[offset])) {
                                offset += 1;
                            }
                        }

                        AddToken(result, ConditionTokenKind.Number, text.Substring(start, offset - start), start, offset);
                        continue;
                    }

                    if (current == '"') {
                        int start = offset;
                        offset += 1;
                        bool closed = false;
                        while (offset < text.Length) {
                            if (text[offset] == '\\' && offset + 1 < text.Length) {
                                offset += 2;
                                continue;
                            }
                            if (text[offset] == '"') {
                                offset += 1;
                                closed = true;
                                break;
                            }

                            offset += 1;
                        }

                        if (!closed) {
                            diagnostics.Add(new DiagnosticModel("INS057",
                                                           DiagnosticSeverityModel.Error,
                                                           "String literal in condition expression is not closed.",
                                                           sourcePath,
                                                           lineNumber,
                                                           baseColumn + start));
                        }

                        AddToken(result, ConditionTokenKind.String, text.Substring(start, offset - start), start, offset);
                        continue;
                    }

                    if (offset + 1 < text.Length) {
                        string two = text.Substring(offset, 2);
                        if (two == "==") {
                            AddToken(result, ConditionTokenKind.Equal, two, offset, offset + 2);
                            offset += 2;
                            continue;
                        }
                        if (two == "!=") {
                            AddToken(result, ConditionTokenKind.NotEqual, two, offset, offset + 2);
                            offset += 2;
                            continue;
                        }
                        if (two == "<=") {
                            AddToken(result, ConditionTokenKind.LessOrEqual, two, offset, offset + 2);
                            offset += 2;
                            continue;
                        }
                        if (two == ">=") {
                            AddToken(result, ConditionTokenKind.GreaterOrEqual, two, offset, offset + 2);
                            offset += 2;
                            continue;
                        }
                        if (two == "+=" || two == "-=") {
                            AddToken(result, ConditionTokenKind.UnsupportedAssignment, two, offset, offset + 2);
                            diagnostics.Add(new DiagnosticModel("INS055",
                                                           DiagnosticSeverityModel.Error,
                                                           "Assignment is not supported in condition expressions.",
                                                           sourcePath,
                                                           lineNumber,
                                                           baseColumn + offset));
                            offset += 2;
                            continue;
                        }
                    }

                    switch (current) {
                        case '(':
                            AddToken(result, ConditionTokenKind.LeftParen, "(", offset, offset + 1);
                            break;
                        case ')':
                            AddToken(result, ConditionTokenKind.RightParen, ")", offset, offset + 1);
                            break;
                        case ',':
                            AddToken(result, ConditionTokenKind.Comma, ",", offset, offset + 1);
                            break;
                        case '.':
                            AddToken(result, ConditionTokenKind.Dot, ".", offset, offset + 1);
                            break;
                        case '<':
                            AddToken(result, ConditionTokenKind.Less, "<", offset, offset + 1);
                            break;
                        case '>':
                            AddToken(result, ConditionTokenKind.Greater, ">", offset, offset + 1);
                            break;
                        case '[':
                            AddToken(result, ConditionTokenKind.UnsupportedArray, "[", offset, offset + 1);
                            diagnostics.Add(new DiagnosticModel("INS054",
                                                           DiagnosticSeverityModel.Error,
                                                           "Arrays and lists are not supported in condition expressions.",
                                                           sourcePath,
                                                           lineNumber,
                                                           baseColumn + offset));
                            break;
                        case '@':
                            AddToken(result, ConditionTokenKind.UnsupportedAction, "@", offset, offset + 1);
                            diagnostics.Add(new DiagnosticModel("INS058",
                                                           DiagnosticSeverityModel.Error,
                                                           "Actions are not supported in condition expressions.",
                                                           sourcePath,
                                                           lineNumber,
                                                           baseColumn + offset));
                            break;
                        case '=':
                            AddToken(result, ConditionTokenKind.UnsupportedAssignment, "=", offset, offset + 1);
                            diagnostics.Add(new DiagnosticModel("INS055",
                                                           DiagnosticSeverityModel.Error,
                                                           "Assignment is not supported in condition expressions.",
                                                           sourcePath,
                                                           lineNumber,
                                                           baseColumn + offset));
                            break;
                        case '+':
                        case '-':
                        case '*':
                        case '/':
                        case '!':
                            AddToken(result, ConditionTokenKind.UnsupportedOperator, current.ToString(), offset, offset + 1);
                            AddUnsupportedOperatorDiagnostic(current.ToString(), offset);
                            break;
                        default:
                            AddToken(result, ConditionTokenKind.UnsupportedOperator, current.ToString(), offset, offset + 1);
                            diagnostics.Add(new DiagnosticModel("INS052",
                                                           DiagnosticSeverityModel.Error,
                                                           "Unexpected token '" + current + "' in condition expression.",
                                                           sourcePath,
                                                           lineNumber,
                                                           baseColumn + offset));
                            break;
                    }

                    offset += 1;
                }

                result.Add(new ConditionToken(ConditionTokenKind.End, string.Empty, text.Length, text.Length, baseColumn + text.Length));
                return result;
            }

            void AddUnsupportedOperatorDiagnostic(string raw, int offset) {
                diagnostics.Add(new DiagnosticModel("INS053",
                                               DiagnosticSeverityModel.Error,
                                               "Operator '" + raw + "' is not supported in condition expressions.",
                                               sourcePath,
                                               lineNumber,
                                               baseColumn + offset));
            }

            void AddToken(List<ConditionToken> result,
                          ConditionTokenKind kind,
                          string raw,
                          int startOffset,
                          int endOffset) {
                result.Add(new ConditionToken(kind, raw, startOffset, endOffset, baseColumn + startOffset));
            }

            static bool IsIdentifierStart(char value) {
                return char.IsLetter(value) || value == '_';
            }

            static bool IsIdentifierPart(char value) {
                return char.IsLetterOrDigit(value) || value == '_' || value == '-';
            }

        }

        sealed class ConditionToken {

            public ConditionTokenKind Kind { get; }

            public string Raw { get; }

            public int Offset { get; }

            public int EndOffset { get; }

            public int Column { get; }

            public ConditionToken(ConditionTokenKind kind, string raw, int offset, int endOffset, int column) {
                Kind = kind;
                Raw = raw;
                Offset = offset;
                EndOffset = endOffset;
                Column = column;
            }

        }

        enum ConditionTokenKind {

            End,
            Identifier,
            String,
            Number,
            Bool,
            And,
            Or,
            Not,
            Equal,
            NotEqual,
            Less,
            LessOrEqual,
            Greater,
            GreaterOrEqual,
            LeftParen,
            RightParen,
            Comma,
            Dot,
            UnsupportedArray,
            UnsupportedAction,
            UnsupportedAssignment,
            UnsupportedOperator,

        }

    }

}
