/**
 * The JMAP Session resource. Fetched once (GET, no body) from a well‑known URL and cached;
 * describes server capabilities, accounts, and the URL templates used for every subsequent request.
 */
export class Session {
  /** Keyed by capability URN, e.g. "urn:ietf:params:jmap:core" → CoreCapability */
  public readonly capabilities: Record<string, unknown>;
  /** Map of account id to Account */
  public readonly accounts: Record<string, Account>;
  /** Capability URN → the account id to use by default for that capability */
  public readonly primaryAccounts: Record<string, string>;
  /** Username of the authenticated user */
  public readonly username: string;
  /** Endpoint for POSTing JMAP method‑call requests */
  public readonly apiUrl: string;
  /** URL template for downloading blobs */
  public readonly downloadUrl: string;
  /** URL template for uploading blobs */
  public readonly uploadUrl: string;
  /** URL template for the push EventSource stream */
  public readonly eventSourceUrl: string;
  /** Opaque string that changes whenever anything in the Session object changes */
  public readonly state: string;

  public constructor(init: {
    capabilities: Record<string, unknown>;
    accounts: Record<string, Account>;
    primaryAccounts: Record<string, string>;
    username: string;
    apiUrl: string;
    downloadUrl: string;
    uploadUrl: string;
    eventSourceUrl: string;
    state: string;
  }) {
    this.capabilities = init.capabilities;
    this.accounts = init.accounts;
    this.primaryAccounts = init.primaryAccounts;
    this.username = init.username;
    this.apiUrl = init.apiUrl;
    this.downloadUrl = init.downloadUrl;
    this.uploadUrl = init.uploadUrl;
    this.eventSourceUrl = init.eventSourceUrl;
    this.state = init.state;
  }

  /** Create a {@link Session} from a raw JSON value, performing minimal validation. */
  public static fromJson(data: unknown): Session {
    if (typeof data !== "object" || data === null) {
      throw new Error("Session.fromJson: input is not an object");
    }
    const obj = data as Record<string, unknown>;

    const capabilitiesRaw = obj["capabilities"];
    const accountsRaw = obj["accounts"];
    const primaryAccountsRaw = obj["primaryAccounts"];
    const username = obj["username"];
    const apiUrl = obj["apiUrl"];
    const downloadUrl = obj["downloadUrl"];
    const uploadUrl = obj["uploadUrl"];
    const eventSourceUrl = obj["eventSourceUrl"];
    const state = obj["state"];

    if (
      capabilitiesRaw === undefined ||
      accountsRaw === undefined ||
      primaryAccountsRaw === undefined ||
      typeof username !== "string" ||
      typeof apiUrl !== "string" ||
      typeof downloadUrl !== "string" ||
      typeof uploadUrl !== "string" ||
      typeof eventSourceUrl !== "string" ||
      typeof state !== "string"
    ) {
      throw new Error("Session.fromJson: missing required fields");
    }

    // capabilities: Record<string, unknown>
    if (typeof capabilitiesRaw !== "object" || capabilitiesRaw === null) {
      throw new Error("Session.fromJson: capabilities must be an object");
    }
    const capabilities = capabilitiesRaw as Record<string, unknown>;

    // accounts: Record<string, Account>
    if (typeof accountsRaw !== "object" || accountsRaw === null) {
      throw new Error("Session.fromJson: accounts must be an object");
    }
    const accounts: Record<string, Account> = {};
    for (const [k, v] of Object.entries(accountsRaw as Record<string, unknown>)) {
      accounts[k] = Account.fromJson(v);
    }

    // primaryAccounts: Record<string, string>
    if (typeof primaryAccountsRaw !== "object" || primaryAccountsRaw === null) {
      throw new Error("Session.fromJson: primaryAccounts must be an object");
    }
    const primaryAccounts: Record<string, string> = {};
    for (const [k, v] of Object.entries(primaryAccountsRaw as Record<string, unknown>)) {
      if (typeof v !== "string") {
        throw new Error(`Session.fromJson: primaryAccounts[${k}] must be a string`);
      }
      primaryAccounts[k] = v;
    }

    return new Session({
      capabilities,
      accounts,
      primaryAccounts,
      username,
      apiUrl,
      downloadUrl,
      uploadUrl,
      eventSourceUrl,
      state,
    });
  }

  /** Convert this {@link Session} to a plain JSON object suitable for transmission. */
  public toJson(): Record<string, unknown> {
    const accountsJson: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(this.accounts)) {
      accountsJson[k] = v.toJson();
    }

    return {
      capabilities: this.capabilities,
      accounts: accountsJson,
      primaryAccounts: this.primaryAccounts,
      username: this.username,
      apiUrl: this.apiUrl,
      downloadUrl: this.downloadUrl,
      uploadUrl: this.uploadUrl,
      eventSourceUrl: this.eventSourceUrl,
      state: this.state,
    };
  }
}

/**
 * Subtype representing an individual account in a Session.
 */
export class Account {
  /** Human‑readable name of the account. Not marked required in the spec. */
  public readonly name?: string;
  /** True if the account is a personal account. Not marked required in the spec. */
  public readonly isPersonal?: boolean;
  /** True if the account is read‑only. Not marked required in the spec. */
  public readonly isReadOnly?: boolean;
  /** Capability URN → capability‑specific info for this account. Not marked required. */
  public readonly accountCapabilities?: Record<string, unknown>;

  public constructor(init: {
    name?: string;
    isPersonal?: boolean;
    isReadOnly?: boolean;
    accountCapabilities?: Record<string, unknown>;
  }) {
    this.name = init.name;
    this.isPersonal = init.isPersonal;
    this.isReadOnly = init.isReadOnly;
    this.accountCapabilities = init.accountCapabilities;
  }

  public static fromJson(data: unknown): Account {
    if (typeof data !== "object" || data === null) {
      throw new Error("Account.fromJson: input is not an object");
    }
    const obj = data as Record<string, unknown>;

    const name = obj["name"];
    const isPersonal = obj["isPersonal"];
    const isReadOnly = obj["isReadOnly"];
    const accountCapabilities = obj["accountCapabilities"];

    if (
      (name !== undefined && typeof name !== "string") ||
      (isPersonal !== undefined && typeof isPersonal !== "boolean") ||
      (isReadOnly !== undefined && typeof isReadOnly !== "boolean") ||
      (accountCapabilities !== undefined &&
        (typeof accountCapabilities !== "object" || accountCapabilities === null))
    ) {
      throw new Error("Account.fromJson: one or more fields have an invalid type");
    }

    return new Account({
      name: name as string | undefined,
      isPersonal: isPersonal as boolean | undefined,
      isReadOnly: isReadOnly as boolean | undefined,
      accountCapabilities: accountCapabilities as Record<string, unknown> | undefined,
    });
  }

  public toJson(): Record<string, unknown> {
    const json: Record<string, unknown> = {};
    if (this.name !== undefined) json.name = this.name;
    if (this.isPersonal !== undefined) json.isPersonal = this.isPersonal;
    if (this.isReadOnly !== undefined) json.isReadOnly = this.isReadOnly;
    if (this.accountCapabilities !== undefined) json.accountCapabilities = this.accountCapabilities;
    return json;
  }
}

/**
 * Subtype representing the Core capability object found under
 * `capabilities["urn:ietf:params:jmap:core"]`.
 */
export class CoreCapability {
  public readonly maxSizeUpload: number;
  public readonly maxConcurrentUpload: number;
  public readonly maxSizeRequest: number;
  public readonly maxConcurrentRequests: number;
  public readonly maxCallsInRequest: number;
  public readonly maxObjectsInGet: number;
  public readonly maxObjectsInSet: number;
  public readonly collationAlgorithms: string[];

  public constructor(init: {
    maxSizeUpload: number;
    maxConcurrentUpload: number;
    maxSizeRequest: number;
    maxConcurrentRequests: number;
    maxCallsInRequest: number;
    maxObjectsInGet: number;
    maxObjectsInSet: number;
    collationAlgorithms: string[];
  }) {
    this.maxSizeUpload = init.maxSizeUpload;
    this.maxConcurrentUpload = init.maxConcurrentUpload;
    this.maxSizeRequest = init.maxSizeRequest;
    this.maxConcurrentRequests = init.maxConcurrentRequests;
    this.maxCallsInRequest = init.maxCallsInRequest;
    this.maxObjectsInGet = init.maxObjectsInGet;
    this.maxObjectsInSet = init.maxObjectsInSet;
    this.collationAlgorithms = init.collationAlgorithms;
  }

  public static fromJson(data: unknown): CoreCapability {
    if (typeof data !== "object" || data === null) {
      throw new Error("CoreCapability.fromJson: input is not an object");
    }
    const obj = data as Record<string, unknown>;

    const maxSizeUpload = obj["maxSizeUpload"];
    const maxConcurrentUpload = obj["maxConcurrentUpload"];
    const maxSizeRequest = obj["maxSizeRequest"];
    const maxConcurrentRequests = obj["maxConcurrentRequests"];
    const maxCallsInRequest = obj["maxCallsInRequest"];
    const maxObjectsInGet = obj["maxObjectsInGet"];
    const maxObjectsInSet = obj["maxObjectsInSet"];
    const collationAlgorithms = obj["collationAlgorithms"];

    const numProps = [
      maxSizeUpload,
      maxConcurrentUpload,
      maxSizeRequest,
      maxConcurrentRequests,
      maxCallsInRequest,
      maxObjectsInGet,
      maxObjectsInSet,
    ];
    if (numProps.some((p) => typeof p !== "number") || !Array.isArray(collationAlgorithms)) {
      throw new Error("CoreCapability.fromJson: missing or invalid required fields");
    }

    if (!collationAlgorithms.every((v) => typeof v === "string")) {
      throw new Error("CoreCapability.fromJson: collationAlgorithms must be an array of strings");
    }

    return new CoreCapability({
      maxSizeUpload: maxSizeUpload as number,
      maxConcurrentUpload: maxConcurrentUpload as number,
      maxSizeRequest: maxSizeRequest as number,
      maxConcurrentRequests: maxConcurrentRequests as number,
      maxCallsInRequest: maxCallsInRequest as number,
      maxObjectsInGet: maxObjectsInGet as number,
      maxObjectsInSet: maxObjectsInSet as number,
      collationAlgorithms: collationAlgorithms as string[],
    });
  }

  public toJson(): Record<string, unknown> {
    return {
      maxSizeUpload: this.maxSizeUpload,
      maxConcurrentUpload: this.maxConcurrentUpload,
      maxSizeRequest: this.maxSizeRequest,
      maxConcurrentRequests: this.maxConcurrentRequests,
      maxCallsInRequest: this.maxCallsInRequest,
      maxObjectsInGet: this.maxObjectsInGet,
      maxObjectsInSet: this.maxObjectsInSet,
      collationAlgorithms: this.collationAlgorithms,
    };
  }
}
