// Auto-generated composition file (template-rendered, not an LLM task).
// Wires together the per-module client mixins produced by the codegen pipeline.

import { JmapClientCore, JmapClientOptions } from "./client-core";
import { MailClientMixin } from "./client-mail";
import { SubmissionClientMixin } from "./client-submission";

export class JmapClient extends SubmissionClientMixin(MailClientMixin(JmapClientCore)) {
  constructor(options: JmapClientOptions) {
    super(options);
  }
}

export { JmapClientOptions };
export { SetError, MethodError, ResultReference, JmapError, JmapProtocolError, JmapNetworkError } from "./models/CommonTypes";
export { JmapTransport, FetchTransport, JmapHttpRequest, JmapHttpResponse } from "./models/Transport";
export { Session, Account, CoreCapability } from "./models/Session";
export { Invocation } from "./models/Invocation";
export { JmapRequestEnvelope } from "./models/JmapRequestEnvelope";
export { JmapResponseEnvelope } from "./models/JmapResponseEnvelope";
export { Mailbox, MailboxRights } from "./models/Mailbox";
export { EmailAddress } from "./models/EmailAddress";
export { EmailAddressGroup } from "./models/EmailAddressGroup";
export { EmailBodyPart } from "./models/EmailBodyPart";
export { EmailHeader } from "./models/EmailHeader";
export { Email, EmailBodyValue } from "./models/Email";
export { Thread } from "./models/Thread";
export { Identity } from "./models/Identity";
export { Comparator } from "./models/Comparator";
export { EmailQueryResponse } from "./models/EmailQueryResponse";
export { SearchSnippet } from "./models/SearchSnippet";
export { Envelope, Address } from "./models/Envelope";
export { DeliveryStatus } from "./models/DeliveryStatus";
export { EmailSubmission } from "./models/EmailSubmission";
