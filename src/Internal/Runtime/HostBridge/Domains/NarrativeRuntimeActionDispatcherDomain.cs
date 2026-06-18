using System;

namespace Inscape.Runtime {

    public static class NarrativeRuntimeActionDispatcherDomain {

        public static NarrativeRuntimeActionResultModel Dispatch(NarrativeRuntimeActionRequestModel request,
                                                                 NarrativeRuntimeActionDispatcherModel dispatcher) {
            if (!TryFindAction(request.Name, dispatcher, out NarrativeRuntimeActionCapabilityModel action)) {
                return Failure("IRA001", "Runtime action is not declared in Host Schema actions[]: " + request.Name, false);
            }

            string mode = NormalizeMode(action.Mode);
            request.Mode = mode;
            if (mode != "fire") {
                return Failure("IRA003", "Runtime action mode is not implemented yet: " + mode, false);
            }

            if (!TryFindHandler(request.Name, dispatcher, out NarrativeRuntimeActionHandlerBindingModel handler)) {
                return Failure("IRA002", "Runtime action has no Host Bridge handler mapping: " + request.Name, false);
            }

            request.HandlerName = handler.HandlerName;
            try {
                NarrativeRuntimeActionResultModel? hostResult = dispatcher.DispatchAction?.Invoke(request);
                if (hostResult == null) {
                    return Success();
                }

                hostResult.RequestWasSent = true;
                if (!hostResult.Succeeded) {
                    if (hostResult.ErrorCode.Length == 0) {
                        hostResult.ErrorCode = "IRA004";
                    }
                    if (hostResult.Status.Length == 0) {
                        hostResult.Status = "failed";
                    }
                    return hostResult;
                }

                if (hostResult.Status.Length == 0) {
                    hostResult.Status = "completed";
                }
                return hostResult;
            } catch (Exception ex) {
                return Failure("IRA004", "Runtime action host dispatcher failed for '" + request.Name + "': " + ex.Message, true);
            }
        }

        static bool TryFindAction(string name,
                                  NarrativeRuntimeActionDispatcherModel dispatcher,
                                  out NarrativeRuntimeActionCapabilityModel action) {
            action = new NarrativeRuntimeActionCapabilityModel();
            for (int i = 0; i < dispatcher.Actions.Count; i += 1) {
                if (dispatcher.Actions[i].Name == name) {
                    action = dispatcher.Actions[i];
                    return true;
                }
            }

            return false;
        }

        static bool TryFindHandler(string name,
                                   NarrativeRuntimeActionDispatcherModel dispatcher,
                                   out NarrativeRuntimeActionHandlerBindingModel handler) {
            handler = new NarrativeRuntimeActionHandlerBindingModel();
            for (int i = 0; i < dispatcher.Handlers.Count; i += 1) {
                if (dispatcher.Handlers[i].Name == name) {
                    handler = dispatcher.Handlers[i];
                    return true;
                }
            }

            return false;
        }

        static string NormalizeMode(string mode) {
            string normalized = mode.Trim().ToLowerInvariant();
            return normalized.Length == 0 ? "fire" : normalized;
        }

        static NarrativeRuntimeActionResultModel Success() {
            return new NarrativeRuntimeActionResultModel {
                Succeeded = true,
                RequestWasSent = true,
                Status = "completed",
            };
        }

        static NarrativeRuntimeActionResultModel Failure(string code, string message, bool requestWasSent) {
            return new NarrativeRuntimeActionResultModel {
                Succeeded = false,
                RequestWasSent = requestWasSent,
                Status = "failed",
                ErrorCode = code,
                ErrorMessage = message,
            };
        }

    }

}
