using System;
using System.Collections.Generic;
using Inscape.Compiler.Model;

namespace Inscape.Runtime {

    public static class NarrativeRuntimeConditionEvaluatorDomain {

        const double NumberEpsilon = 0.000001;

        public static NarrativeRuntimeConditionEvaluationModel Evaluate(DslScriptConditionExpressionModel? expression,
                                                                        NarrativeRuntimeStateModel state,
                                                                        NarrativeRuntimeQueryProviderModel provider,
                                                                        string context = "",
                                                                        NarrativeRuntimeQueryReceiptScopeModel? receiptScope = null,
                                                                        IList<NarrativeRuntimeQueryReceiptModel>? queryReceipts = null) {
            NarrativeRuntimeConditionEvaluationModel evaluation = EvaluateValue(expression,
                                                                               state,
                                                                               provider,
                                                                               context,
                                                                               "expression",
                                                                               receiptScope,
                                                                               queryReceipts);
            if (!evaluation.Succeeded) {
                return evaluation;
            }

            if (evaluation.Value.Kind != NarrativeRuntimeQueryValueKindModel.Bool) {
                return Failure("IRC008",
                               "expression",
                               SourceOf(expression),
                               "Runtime condition expression must evaluate to bool.");
            }

            return evaluation;
        }

        static NarrativeRuntimeConditionEvaluationModel EvaluateValue(DslScriptConditionExpressionModel? expression,
                                                                      NarrativeRuntimeStateModel state,
                                                                      NarrativeRuntimeQueryProviderModel provider,
                                                                      string context,
                                                                      string path,
                                                                      NarrativeRuntimeQueryReceiptScopeModel? receiptScope,
                                                                      IList<NarrativeRuntimeQueryReceiptModel>? queryReceipts) {
            if (expression == null) {
                return Failure("IRC001",
                               path,
                               SourceSpanModel.Empty,
                               "Runtime condition expression is missing.");
            }

            if (expression.Kind == DslScriptConditionExpressionKindModel.Literal) {
                return EvaluateLiteral(expression.Literal, path);
            }

            if (expression.Kind == DslScriptConditionExpressionKindModel.Query) {
                return EvaluateQuery(expression.Query, state, provider, context, path, receiptScope, queryReceipts);
            }

            if (expression.Kind == DslScriptConditionExpressionKindModel.Unary) {
                return EvaluateUnary(expression, state, provider, context, path, receiptScope, queryReceipts);
            }

            if (expression.Kind == DslScriptConditionExpressionKindModel.Binary) {
                return EvaluateBinary(expression, state, provider, context, path, receiptScope, queryReceipts);
            }

            if (expression.Kind == DslScriptConditionExpressionKindModel.Comparison) {
                return EvaluateComparison(expression, state, provider, context, path, receiptScope, queryReceipts);
            }

            return Failure("IRC009",
                           path,
                           expression.Source,
                           "Runtime condition expression kind is not supported: " + expression.Kind);
        }

        static NarrativeRuntimeConditionEvaluationModel EvaluateLiteral(DslScriptConditionLiteralModel? literal,
                                                                        string path) {
            if (literal == null) {
                return Failure("IRC002",
                               path,
                               SourceSpanModel.Empty,
                               "Runtime condition literal is missing.");
            }

            if (literal.LiteralKind == DslScriptConditionLiteralKindModel.String
                || literal.LiteralKind == DslScriptConditionLiteralKindModel.Identifier) {
                return Success(NarrativeRuntimeQueryValueModel.FromString(literal.StringValue));
            }

            if (literal.LiteralKind == DslScriptConditionLiteralKindModel.Number) {
                return Success(NarrativeRuntimeQueryValueModel.FromNumber(literal.NumberValue));
            }

            if (literal.LiteralKind == DslScriptConditionLiteralKindModel.Bool) {
                return Success(NarrativeRuntimeQueryValueModel.FromBool(literal.BoolValue));
            }

            return Failure("IRC002",
                           path,
                           literal.Source,
                           "Runtime condition literal kind is not supported: " + literal.LiteralKind);
        }

        static NarrativeRuntimeConditionEvaluationModel EvaluateQuery(DslScriptConditionQueryModel? query,
                                                                      NarrativeRuntimeStateModel state,
                                                                      NarrativeRuntimeQueryProviderModel provider,
                                                                      string context,
                                                                      string path,
                                                                      NarrativeRuntimeQueryReceiptScopeModel? receiptScope,
                                                                      IList<NarrativeRuntimeQueryReceiptModel>? queryReceipts) {
            if (query == null) {
                return Failure("IRC003",
                               path,
                               SourceSpanModel.Empty,
                               "Runtime condition query is missing.");
            }

            NarrativeRuntimeQueryRequestModel request = new NarrativeRuntimeQueryRequestModel {
                Name = query.Name,
                Context = context,
            };

            for (int i = 0; i < query.Arguments.Count; i += 1) {
                NarrativeRuntimeConditionEvaluationModel argument = EvaluateLiteral(query.Arguments[i],
                                                                                   path + ".arguments[" + i + "]");
                if (!argument.Succeeded) {
                    return argument;
                }

                request.Arguments.Add(argument.Value);
            }

            NarrativeRuntimeQueryResultModel queryResult;
            try {
                queryResult = NarrativeRuntimeQueryProviderDomain.Resolve(request, state, provider);
            } catch (Exception ex) {
                return Failure("IRC004",
                               path,
                               query.Source,
                               "Runtime condition query provider failed for '" + query.Name + "': " + ex.Message);
            }

            if (!queryResult.Found) {
                return Failure("IRC003",
                               path,
                               query.Source,
                               "Runtime condition query was not found: " + query.Name);
            }

            AddQueryReceipt(query, request, queryResult, receiptScope, queryReceipts);
            return Success(CloneValue(queryResult.Value));
        }

        static NarrativeRuntimeConditionEvaluationModel EvaluateUnary(DslScriptConditionExpressionModel expression,
                                                                      NarrativeRuntimeStateModel state,
                                                                      NarrativeRuntimeQueryProviderModel provider,
                                                                      string context,
                                                                      string path,
                                                                      NarrativeRuntimeQueryReceiptScopeModel? receiptScope,
                                                                      IList<NarrativeRuntimeQueryReceiptModel>? queryReceipts) {
            if (expression.Operator != "not") {
                return Failure("IRC007",
                               path,
                               expression.Source,
                               "Runtime condition unary operator is not supported: " + expression.Operator);
            }

            NarrativeRuntimeConditionEvaluationModel operand = EvaluateValue(expression.Operand,
                                                                            state,
                                                                            provider,
                                                                            context,
                                                                            path + ".operand",
                                                                            receiptScope,
                                                                            queryReceipts);
            if (!operand.Succeeded) {
                return operand;
            }

            if (operand.Value.Kind != NarrativeRuntimeQueryValueKindModel.Bool) {
                return Failure("IRC005",
                               path + ".operand",
                               SourceOf(expression.Operand),
                               "Runtime condition operator 'not' requires a bool operand.");
            }

            return Success(NarrativeRuntimeQueryValueModel.FromBool(!operand.Value.BoolValue));
        }

        static NarrativeRuntimeConditionEvaluationModel EvaluateBinary(DslScriptConditionExpressionModel expression,
                                                                       NarrativeRuntimeStateModel state,
                                                                       NarrativeRuntimeQueryProviderModel provider,
                                                                       string context,
                                                                       string path,
                                                                       NarrativeRuntimeQueryReceiptScopeModel? receiptScope,
                                                                       IList<NarrativeRuntimeQueryReceiptModel>? queryReceipts) {
            if (expression.Operator == "and") {
                NarrativeRuntimeConditionEvaluationModel left = EvaluateValue(expression.Left,
                                                                             state,
                                                                             provider,
                                                                             context,
                                                                             path + ".left",
                                                                             receiptScope,
                                                                             queryReceipts);
                if (!left.Succeeded) {
                    return left;
                }

                if (left.Value.Kind != NarrativeRuntimeQueryValueKindModel.Bool) {
                    return Failure("IRC005",
                                   path + ".left",
                                   SourceOf(expression.Left),
                                   "Runtime condition operator 'and' requires bool operands.");
                }

                if (!left.Value.BoolValue) {
                    return Success(NarrativeRuntimeQueryValueModel.FromBool(false));
                }

                NarrativeRuntimeConditionEvaluationModel right = EvaluateValue(expression.Right,
                                                                              state,
                                                                              provider,
                                                                              context,
                                                                              path + ".right",
                                                                              receiptScope,
                                                                              queryReceipts);
                if (!right.Succeeded) {
                    return right;
                }

                if (right.Value.Kind != NarrativeRuntimeQueryValueKindModel.Bool) {
                    return Failure("IRC005",
                                   path + ".right",
                                   SourceOf(expression.Right),
                                   "Runtime condition operator 'and' requires bool operands.");
                }

                return Success(NarrativeRuntimeQueryValueModel.FromBool(right.Value.BoolValue));
            }

            if (expression.Operator == "or") {
                NarrativeRuntimeConditionEvaluationModel left = EvaluateValue(expression.Left,
                                                                             state,
                                                                             provider,
                                                                             context,
                                                                             path + ".left",
                                                                             receiptScope,
                                                                             queryReceipts);
                if (!left.Succeeded) {
                    return left;
                }

                if (left.Value.Kind != NarrativeRuntimeQueryValueKindModel.Bool) {
                    return Failure("IRC005",
                                   path + ".left",
                                   SourceOf(expression.Left),
                                   "Runtime condition operator 'or' requires bool operands.");
                }

                if (left.Value.BoolValue) {
                    return Success(NarrativeRuntimeQueryValueModel.FromBool(true));
                }

                NarrativeRuntimeConditionEvaluationModel right = EvaluateValue(expression.Right,
                                                                              state,
                                                                              provider,
                                                                              context,
                                                                              path + ".right",
                                                                              receiptScope,
                                                                              queryReceipts);
                if (!right.Succeeded) {
                    return right;
                }

                if (right.Value.Kind != NarrativeRuntimeQueryValueKindModel.Bool) {
                    return Failure("IRC005",
                                   path + ".right",
                                   SourceOf(expression.Right),
                                   "Runtime condition operator 'or' requires bool operands.");
                }

                return Success(NarrativeRuntimeQueryValueModel.FromBool(right.Value.BoolValue));
            }

            return Failure("IRC007",
                           path,
                           expression.Source,
                           "Runtime condition binary operator is not supported: " + expression.Operator);
        }

        static NarrativeRuntimeConditionEvaluationModel EvaluateComparison(DslScriptConditionExpressionModel expression,
                                                                          NarrativeRuntimeStateModel state,
                                                                          NarrativeRuntimeQueryProviderModel provider,
                                                                          string context,
                                                                          string path,
                                                                          NarrativeRuntimeQueryReceiptScopeModel? receiptScope,
                                                                          IList<NarrativeRuntimeQueryReceiptModel>? queryReceipts) {
            NarrativeRuntimeConditionEvaluationModel left = EvaluateValue(expression.Left,
                                                                         state,
                                                                         provider,
                                                                         context,
                                                                         path + ".left",
                                                                         receiptScope,
                                                                         queryReceipts);
            if (!left.Succeeded) {
                return left;
            }

            NarrativeRuntimeConditionEvaluationModel right = EvaluateValue(expression.Right,
                                                                          state,
                                                                          provider,
                                                                          context,
                                                                          path + ".right",
                                                                          receiptScope,
                                                                          queryReceipts);
            if (!right.Succeeded) {
                return right;
            }

            if (expression.Operator == "==" || expression.Operator == "!=") {
                if (left.Value.Kind != right.Value.Kind) {
                    return Failure("IRC006",
                                   path,
                                   expression.Source,
                                   "Runtime condition equality comparison requires values of the same type.");
                }

                bool equal = ValuesEqual(left.Value, right.Value);
                return Success(NarrativeRuntimeQueryValueModel.FromBool(expression.Operator == "==" ? equal : !equal));
            }

            if (expression.Operator == "<"
                || expression.Operator == "<="
                || expression.Operator == ">"
                || expression.Operator == ">=") {
                if (left.Value.Kind != NarrativeRuntimeQueryValueKindModel.Number
                    || right.Value.Kind != NarrativeRuntimeQueryValueKindModel.Number) {
                    return Failure("IRC006",
                                   path,
                                   expression.Source,
                                   "Runtime condition ordered comparison requires number values.");
                }

                bool result = CompareNumbers(left.Value.NumberValue, right.Value.NumberValue, expression.Operator);
                return Success(NarrativeRuntimeQueryValueModel.FromBool(result));
            }

            return Failure("IRC007",
                           path,
                           expression.Source,
                           "Runtime condition comparison operator is not supported: " + expression.Operator);
        }

        static bool ValuesEqual(NarrativeRuntimeQueryValueModel left, NarrativeRuntimeQueryValueModel right) {
            if (left.Kind == NarrativeRuntimeQueryValueKindModel.String) {
                return string.Equals(left.StringValue, right.StringValue, StringComparison.Ordinal);
            }

            if (left.Kind == NarrativeRuntimeQueryValueKindModel.Number) {
                return Math.Abs(left.NumberValue - right.NumberValue) < NumberEpsilon;
            }

            if (left.Kind == NarrativeRuntimeQueryValueKindModel.Bool) {
                return left.BoolValue == right.BoolValue;
            }

            return left.Kind == right.Kind;
        }

        static bool CompareNumbers(double left, double right, string op) {
            if (op == "<") {
                return left < right;
            }

            if (op == "<=") {
                return left <= right;
            }

            if (op == ">") {
                return left > right;
            }

            return left >= right;
        }

        static NarrativeRuntimeQueryValueModel CloneValue(NarrativeRuntimeQueryValueModel value) {
            if (value.Kind == NarrativeRuntimeQueryValueKindModel.String) {
                return NarrativeRuntimeQueryValueModel.FromString(value.StringValue);
            }

            if (value.Kind == NarrativeRuntimeQueryValueKindModel.Number) {
                return NarrativeRuntimeQueryValueModel.FromNumber(value.NumberValue);
            }

            if (value.Kind == NarrativeRuntimeQueryValueKindModel.Bool) {
                return NarrativeRuntimeQueryValueModel.FromBool(value.BoolValue);
            }

            return new NarrativeRuntimeQueryValueModel {
                Kind = value.Kind,
            };
        }

        static void AddQueryReceipt(DslScriptConditionQueryModel query,
                                    NarrativeRuntimeQueryRequestModel request,
                                    NarrativeRuntimeQueryResultModel queryResult,
                                    NarrativeRuntimeQueryReceiptScopeModel? receiptScope,
                                    IList<NarrativeRuntimeQueryReceiptModel>? queryReceipts) {
            if (receiptScope == null || queryReceipts == null) {
                return;
            }

            NarrativeRuntimeQueryReceiptModel receipt = new NarrativeRuntimeQueryReceiptModel {
                Id = "query-" + (queryReceipts.Count + 1),
                Context = receiptScope.Context,
                NodeId = receiptScope.NodeId,
                BranchPath = receiptScope.BranchPath,
                ChoiceGroupIndex = receiptScope.ChoiceGroupIndex,
                ChoiceOptionIndex = receiptScope.ChoiceOptionIndex,
                ConditionalJumpIndex = receiptScope.ConditionalJumpIndex,
                SourceLine = query.Source.Line,
                SourceColumn = query.Source.Column,
                Name = query.Name,
                Syntax = query.Syntax == DslScriptConditionQuerySyntaxModel.Call ? "call" : "path",
                Result = CloneValue(queryResult.Value),
                SourceKind = SourceKindName(queryResult.SourceKind),
                Deterministic = queryResult.IsDeterministic,
            };

            for (int i = 0; i < request.Arguments.Count; i += 1) {
                receipt.Arguments.Add(CloneValue(request.Arguments[i]));
            }

            queryReceipts.Add(receipt);
        }

        static string SourceKindName(NarrativeRuntimeQuerySourceKindModel sourceKind) {
            if (sourceKind == NarrativeRuntimeQuerySourceKindModel.InternalFact) {
                return "internal-fact";
            }

            if (sourceKind == NarrativeRuntimeQuerySourceKindModel.Delegate) {
                return "delegate";
            }

            if (sourceKind == NarrativeRuntimeQuerySourceKindModel.Mock) {
                return "mock";
            }

            if (sourceKind == NarrativeRuntimeQuerySourceKindModel.Recorded) {
                return "recorded";
            }

            return "none";
        }

        static SourceSpanModel SourceOf(DslScriptConditionExpressionModel? expression) {
            return expression?.Source ?? SourceSpanModel.Empty;
        }

        static NarrativeRuntimeConditionEvaluationModel Success(NarrativeRuntimeQueryValueModel value) {
            return new NarrativeRuntimeConditionEvaluationModel {
                Succeeded = true,
                Value = value,
            };
        }

        static NarrativeRuntimeConditionEvaluationModel Failure(string code,
                                                                string path,
                                                                SourceSpanModel source,
                                                                string message) {
            NarrativeRuntimeConditionEvaluationModel result = new NarrativeRuntimeConditionEvaluationModel();
            result.Succeeded = false;
            result.Diagnostics.Add(new NarrativeRuntimeConditionEvaluationDiagnosticModel {
                Code = code,
                Severity = "error",
                Path = path,
                Source = source,
                Message = message,
            });
            return result;
        }

    }

}
