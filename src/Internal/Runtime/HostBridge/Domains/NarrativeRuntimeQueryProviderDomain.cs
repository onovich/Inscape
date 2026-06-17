using System;
using System.Collections.Generic;

namespace Inscape.Runtime {

    public static class NarrativeRuntimeQueryProviderDomain {

        public static NarrativeRuntimeQueryResultModel Resolve(NarrativeRuntimeQueryRequestModel request,
                                                               NarrativeRuntimeStateModel state,
                                                               NarrativeRuntimeQueryProviderModel provider) {
            if (TryResolveInternalFact(request, state, out NarrativeRuntimeQueryResultModel internalResult)) {
                return internalResult;
            }

            if (provider.Kind == NarrativeRuntimeQueryProviderKindModel.Delegate) {
                NarrativeRuntimeQueryResultModel? delegated = provider.DelegateQuery?.Invoke(request);
                if (delegated != null) {
                    delegated.SourceKind = NarrativeRuntimeQuerySourceKindModel.Delegate;
                    delegated.IsReadOnly = true;
                    delegated.IsDeterministic = false;
                    return delegated;
                }

                return Missing(NarrativeRuntimeQuerySourceKindModel.Delegate);
            }

            if (provider.Kind == NarrativeRuntimeQueryProviderKindModel.Mock) {
                return ResolveValueTable(request, provider.MockValues, NarrativeRuntimeQuerySourceKindModel.Mock);
            }

            return ResolveValueTable(request, provider.RecordedValues, NarrativeRuntimeQuerySourceKindModel.Recorded);
        }

        static bool TryResolveInternalFact(NarrativeRuntimeQueryRequestModel request,
                                           NarrativeRuntimeStateModel state,
                                           out NarrativeRuntimeQueryResultModel result) {
            result = Missing(NarrativeRuntimeQuerySourceKindModel.InternalFact);

            if (request.Name == "current_node") {
                result = Found(NarrativeRuntimeQuerySourceKindModel.InternalFact,
                               NarrativeRuntimeQueryValueModel.FromString(state.CurrentNodeName));
                return true;
            }

            if (request.Name == "previous_node") {
                string previousNode = state.Path.Count >= 2 ? state.Path[state.Path.Count - 2] : string.Empty;
                result = Found(NarrativeRuntimeQuerySourceKindModel.InternalFact,
                               NarrativeRuntimeQueryValueModel.FromString(previousNode));
                return true;
            }

            if (request.Name == "visited" && TryReadStringArgument(request, 0, out string visitedNode)) {
                result = Found(NarrativeRuntimeQuerySourceKindModel.InternalFact,
                               NarrativeRuntimeQueryValueModel.FromBool(FindVisitCount(state.Facts, visitedNode) > 0));
                return true;
            }

            if (request.Name == "visit_count" && TryReadStringArgument(request, 0, out string visitCountNode)) {
                result = Found(NarrativeRuntimeQuerySourceKindModel.InternalFact,
                               NarrativeRuntimeQueryValueModel.FromNumber(FindVisitCount(state.Facts, visitCountNode)));
                return true;
            }

            if (request.Name == "seen" && TryReadStringArgument(request, 0, out string lineAnchor)) {
                result = Found(NarrativeRuntimeQuerySourceKindModel.InternalFact,
                               NarrativeRuntimeQueryValueModel.FromBool(state.Facts.SeenLineAnchors.Contains(lineAnchor)));
                return true;
            }

            if (request.Name == "choice_made" && TryReadStringArgument(request, 0, out string choiceAnchor)) {
                result = Found(NarrativeRuntimeQuerySourceKindModel.InternalFact,
                               NarrativeRuntimeQueryValueModel.FromBool(FindChoiceCount(state.Facts, choiceAnchor) > 0));
                return true;
            }

            if (request.Name == "choice_count" && TryReadStringArgument(request, 0, out string choiceCountAnchor)) {
                result = Found(NarrativeRuntimeQuerySourceKindModel.InternalFact,
                               NarrativeRuntimeQueryValueModel.FromNumber(FindChoiceCount(state.Facts, choiceCountAnchor)));
                return true;
            }

            if (request.Name == "last_choice") {
                string nodeName = TryReadStringArgument(request, 0, out string requestedNode) ? requestedNode : string.Empty;
                result = Found(NarrativeRuntimeQuerySourceKindModel.InternalFact,
                               NarrativeRuntimeQueryValueModel.FromString(FindLastChoice(state.Facts, nodeName)));
                return true;
            }

            return false;
        }

        static NarrativeRuntimeQueryResultModel ResolveValueTable(NarrativeRuntimeQueryRequestModel request,
                                                                  IReadOnlyList<NarrativeRuntimeQueryValueEntryModel> entries,
                                                                  NarrativeRuntimeQuerySourceKindModel sourceKind) {
            for (int i = 0; i < entries.Count; i += 1) {
                NarrativeRuntimeQueryValueEntryModel entry = entries[i];
                if (entry.Name == request.Name && ArgumentsMatch(entry.Arguments, request.Arguments)) {
                    return Found(sourceKind, entry.Value);
                }
            }

            return Missing(sourceKind);
        }

        static bool ArgumentsMatch(IReadOnlyList<NarrativeRuntimeQueryValueModel> expected,
                                   IReadOnlyList<NarrativeRuntimeQueryValueModel> actual) {
            if (expected.Count != actual.Count) {
                return false;
            }

            for (int i = 0; i < expected.Count; i += 1) {
                if (!ValueMatches(expected[i], actual[i])) {
                    return false;
                }
            }

            return true;
        }

        static bool ValueMatches(NarrativeRuntimeQueryValueModel expected, NarrativeRuntimeQueryValueModel actual) {
            if (expected.Kind != actual.Kind) {
                return false;
            }

            if (expected.Kind == NarrativeRuntimeQueryValueKindModel.String) {
                return expected.StringValue == actual.StringValue;
            }
            if (expected.Kind == NarrativeRuntimeQueryValueKindModel.Number) {
                return Math.Abs(expected.NumberValue - actual.NumberValue) < 0.000001;
            }
            if (expected.Kind == NarrativeRuntimeQueryValueKindModel.Bool) {
                return expected.BoolValue == actual.BoolValue;
            }

            return true;
        }

        static bool TryReadStringArgument(NarrativeRuntimeQueryRequestModel request, int index, out string value) {
            value = string.Empty;
            if (index < 0 || index >= request.Arguments.Count) {
                return false;
            }

            NarrativeRuntimeQueryValueModel argument = request.Arguments[index];
            if (argument.Kind != NarrativeRuntimeQueryValueKindModel.String) {
                return false;
            }

            value = argument.StringValue;
            return true;
        }

        static int FindVisitCount(NarrativeRuntimeFactsModel facts, string nodeName) {
            for (int i = 0; i < facts.VisitedNodes.Count; i += 1) {
                if (facts.VisitedNodes[i].NodeName == nodeName) {
                    return facts.VisitedNodes[i].Count;
                }
            }

            return 0;
        }

        static int FindChoiceCount(NarrativeRuntimeFactsModel facts, string optionAnchor) {
            int count = 0;
            for (int i = 0; i < facts.ChoiceHistory.Count; i += 1) {
                if (facts.ChoiceHistory[i].OptionAnchor == optionAnchor) {
                    count += 1;
                }
            }

            return count;
        }

        static string FindLastChoice(NarrativeRuntimeFactsModel facts, string nodeName) {
            for (int i = facts.ChoiceHistory.Count - 1; i >= 0; i -= 1) {
                NarrativeRuntimeChoiceFactModel choice = facts.ChoiceHistory[i];
                if (nodeName.Length == 0 || choice.NodeName == nodeName) {
                    return choice.OptionAnchor;
                }
            }

            return string.Empty;
        }

        static NarrativeRuntimeQueryResultModel Found(NarrativeRuntimeQuerySourceKindModel sourceKind,
                                                      NarrativeRuntimeQueryValueModel value) {
            return new NarrativeRuntimeQueryResultModel {
                Found = true,
                SourceKind = sourceKind,
                Value = value,
                IsReadOnly = true,
                IsDeterministic = sourceKind != NarrativeRuntimeQuerySourceKindModel.Delegate,
            };
        }

        static NarrativeRuntimeQueryResultModel Missing(NarrativeRuntimeQuerySourceKindModel sourceKind) {
            return new NarrativeRuntimeQueryResultModel {
                Found = false,
                SourceKind = sourceKind,
                IsReadOnly = true,
                IsDeterministic = true,
            };
        }

    }

}
