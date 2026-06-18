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
            if (!IsSupportedMode(mode)) {
                return Failure("IRA003", "Runtime action mode is not implemented yet: " + mode, false);
            }

            if (!TryFindHandler(request.Name, dispatcher, out NarrativeRuntimeActionHandlerBindingModel handler)) {
                return Failure("IRA002", "Runtime action has no Host Bridge handler mapping: " + request.Name, false);
            }

            request.HandlerName = handler.HandlerName;
            try {
                NarrativeRuntimeActionResultModel? hostResult = dispatcher.DispatchAction?.Invoke(request);
                if (hostResult == null) {
                    return Success(mode);
                }

                hostResult.RequestWasSent = true;
                string status = NormalizeStatus(hostResult.Status, mode);
                hostResult.Status = status;
                bool invalidSuccessStatus = !IsHostErrorStatus(status) && !IsSuccessfulStatus(status, mode);
                if (!hostResult.Succeeded || IsHostErrorStatus(status) || invalidSuccessStatus) {
                    hostResult.Succeeded = false;
                    if (hostResult.ErrorCode.Length == 0) {
                        hostResult.ErrorCode = "IRA004";
                    }
                    if (invalidSuccessStatus && hostResult.ErrorMessage.Length == 0) {
                        hostResult.ErrorMessage = "Runtime action host dispatcher returned unsupported status '" + status + "' for mode '" + mode + "'.";
                    }
                    return hostResult;
                }

                if (IsPendingMode(mode)) {
                    hostResult.Status = "waiting";
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

        static string NormalizeStatus(string status, string mode) {
            string normalized = status.Trim().ToLowerInvariant();
            if (normalized.Length == 0 || (IsPendingMode(mode) && normalized == "completed")) {
                return IsPendingMode(mode) ? "waiting" : "completed";
            }

            return normalized;
        }

        static bool IsSupportedMode(string mode) {
            return mode == "fire" || IsPendingMode(mode);
        }

        static bool IsPendingMode(string mode) {
            return mode == "wait" || mode == "handoff";
        }

        static bool IsHostErrorStatus(string status) {
            return status == "failed" || status == "cancelled" || status == "timeout";
        }

        static bool IsSuccessfulStatus(string status, string mode) {
            return (mode == "fire" && status == "completed") || (IsPendingMode(mode) && status == "waiting");
        }

        static NarrativeRuntimeActionResultModel Success(string mode) {
            return new NarrativeRuntimeActionResultModel {
                Succeeded = true,
                RequestWasSent = true,
                Status = IsPendingMode(mode) ? "waiting" : "completed",
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
