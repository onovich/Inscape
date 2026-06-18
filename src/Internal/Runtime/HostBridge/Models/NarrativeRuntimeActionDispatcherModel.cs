using System;
using System.Collections.Generic;

namespace Inscape.Runtime {

    public sealed class NarrativeRuntimeActionDispatcherModel {

        public List<NarrativeRuntimeActionCapabilityModel> Actions { get; set; }

        public List<NarrativeRuntimeActionHandlerBindingModel> Handlers { get; set; }

        public Func<NarrativeRuntimeActionRequestModel, NarrativeRuntimeActionResultModel?>? DispatchAction { get; set; }

        public NarrativeRuntimeActionDispatcherModel() {
            Actions = new List<NarrativeRuntimeActionCapabilityModel>();
            Handlers = new List<NarrativeRuntimeActionHandlerBindingModel>();
        }

    }

    public sealed class NarrativeRuntimeActionCapabilityModel {

        public string Name { get; set; }

        public string Mode { get; set; }

        public NarrativeRuntimeActionCapabilityModel() {
            Name = string.Empty;
            Mode = "fire";
        }

    }

    public sealed class NarrativeRuntimeActionHandlerBindingModel {

        public string Name { get; set; }

        public string HandlerName { get; set; }

        public NarrativeRuntimeActionHandlerBindingModel() {
            Name = string.Empty;
            HandlerName = string.Empty;
        }

    }

    public sealed class NarrativeRuntimeActionRequestModel {

        public string RequestId { get; set; }

        public string Name { get; set; }

        public string Mode { get; set; }

        public string HandlerName { get; set; }

        public List<NarrativeRuntimeActionArgumentModel> Arguments { get; set; }

        public string NodeId { get; set; }

        public string LineId { get; set; }

        public int SourceLine { get; set; }

        public int SourceColumn { get; set; }

        public string Raw { get; set; }

        public NarrativeRuntimeActionRequestModel() {
            RequestId = string.Empty;
            Name = string.Empty;
            Mode = string.Empty;
            HandlerName = string.Empty;
            Arguments = new List<NarrativeRuntimeActionArgumentModel>();
            NodeId = string.Empty;
            LineId = string.Empty;
            Raw = string.Empty;
        }

    }

    public sealed class NarrativeRuntimePendingActionModel {

        public string RequestId { get; set; }

        public string Name { get; set; }

        public string Mode { get; set; }

        public string HandlerName { get; set; }

        public string Status { get; set; }

        public List<NarrativeRuntimeActionArgumentModel> Arguments { get; set; }

        public string NodeId { get; set; }

        public string LineId { get; set; }

        public int SourceLine { get; set; }

        public int SourceColumn { get; set; }

        public string Raw { get; set; }

        public string HostPayload { get; set; }

        public NarrativeRuntimePendingActionModel() {
            RequestId = string.Empty;
            Name = string.Empty;
            Mode = string.Empty;
            HandlerName = string.Empty;
            Status = "waiting";
            Arguments = new List<NarrativeRuntimeActionArgumentModel>();
            NodeId = string.Empty;
            LineId = string.Empty;
            Raw = string.Empty;
            HostPayload = string.Empty;
        }

    }

    public sealed class NarrativeRuntimeActionResumeModel {

        public string RequestId { get; set; }

        public string Status { get; set; }

        public string HostPayload { get; set; }

        public string ErrorCode { get; set; }

        public string ErrorMessage { get; set; }

        public NarrativeRuntimeActionResumeModel() {
            RequestId = string.Empty;
            Status = "completed";
            HostPayload = string.Empty;
            ErrorCode = string.Empty;
            ErrorMessage = string.Empty;
        }

    }

    public sealed class NarrativeRuntimeActionArgumentModel {

        public int Index { get; set; }

        public string Raw { get; set; }

        public NarrativeRuntimeQueryValueModel Value { get; set; }

        public int SourceLine { get; set; }

        public int SourceColumn { get; set; }

        public NarrativeRuntimeActionArgumentModel() {
            Raw = string.Empty;
            Value = new NarrativeRuntimeQueryValueModel();
        }

    }

    public sealed class NarrativeRuntimeActionResultModel {

        public bool Succeeded { get; set; }

        public bool RequestWasSent { get; set; }

        public string Status { get; set; }

        public string ErrorCode { get; set; }

        public string ErrorMessage { get; set; }

        public string HostPayload { get; set; }

        public NarrativeRuntimeActionResultModel() {
            Succeeded = true;
            Status = "completed";
            ErrorCode = string.Empty;
            ErrorMessage = string.Empty;
            HostPayload = string.Empty;
        }

    }

}
