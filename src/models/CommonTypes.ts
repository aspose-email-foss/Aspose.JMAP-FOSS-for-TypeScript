/**
 * Shared JMAP primitive type aliases.
 */
export type Id = string; // Base64url string, 1‑255 chars
export type Int = number; // Signed integer, no fraction
export type UnsignedInt = number; // Non‑negative integer, no fraction
export type Date = string; // RFC 3339 date‑time string
export type UTCDate = string; // RFC 3339 date‑time with zero UTC offset

/**
 * A JSON‑Pointer‑keyed map used for patch operations.
 *
 * This type has no runtime representation; it is only documented for
 * reference in method signatures.
 */
export type PatchObject = Record<string, unknown>;

/**
 * Base class for all JMAP‑related errors.
 */
export class JmapError extends Error {
    /** @internal */
    constructor(message: string) {
        super(message);
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = this.constructor.name;
    }
}

/**
 * Represents a protocol‑level error returned by the JMAP server.
 *
 * The `type` field corresponds to the JMAP error type (e.g. `unknownMethod`,
 * `invalidArguments`, etc.). The optional `description` provides additional
 * human‑readable detail.
 */
export class JmapProtocolError extends JmapError {
    public readonly type: string;
    public readonly description: string | null;

    /**
     * @param type - JMAP error type identifier.
     * @param description - Optional human‑readable description.
     */
    constructor(type: string, description: string | null = null) {
        super(description ? `${type}: ${description}` : type);
        this.type = type;
        this.description = description;
    }
}

/**
 * Represents a network‑level failure (e.g. fetch rejected, timeout).
 */
export class JmapNetworkError extends JmapError {
    public readonly cause: unknown;

    /**
     * @param message - Human‑readable error message.
     * @param cause - The underlying error object, if any.
     */
    constructor(message: string, cause: unknown = null) {
        super(message);
        this.cause = cause;
    }
}

/**
 * Standard error shape returned per‑id in `notCreated`, `notUpdated`,
 * or `notDestroyed` responses.
 */
export class SetError {
    public readonly type: string;
    public readonly description: string | null;
    public readonly properties: string[] | null;

    /**
     * @param type - Error type identifier (e.g. `invalidProperties`).
     * @param description - Optional human‑readable description.
     * @param properties - Optional list of property names that caused the error.
     */
    constructor(params: {
        type: string;
        description?: string | null;
        properties?: string[] | null;
    }) {
        this.type = params.type;
        this.description = params.description ?? null;
        this.properties = params.properties ?? null;
    }

    /**
     * Creates a {@link SetError} instance from an unknown JSON value.
     *
     * @throws {@link JmapProtocolError} if the input is not a valid SetError object.
     */
    public static fromJson(data: unknown): SetError {
        if (typeof data !== 'object' || data === null) {
            throw new JmapProtocolError('invalidArguments', 'SetError must be an object');
        }
        const obj = data as Record<string, unknown>;

        const type = obj['type'];
        if (typeof type !== 'string') {
            throw new JmapProtocolError('invalidArguments', 'SetError.type must be a string');
        }

        const description = obj.hasOwnProperty('description')
            ? (obj['description'] as string | null)
            : null;
        if (description !== null && description !== undefined && typeof description !== 'string') {
            throw new JmapProtocolError('invalidArguments', 'SetError.description must be a string or null');
        }

        const properties = obj.hasOwnProperty('properties')
            ? (obj['properties'] as unknown)
            : null;
        let propsArray: string[] | null = null;
        if (Array.isArray(properties)) {
            if (!properties.every(p => typeof p === 'string')) {
                throw new JmapProtocolError('invalidArguments', 'SetError.properties must be an array of strings');
            }
            propsArray = properties as string[];
        } else if (properties !== null && properties !== undefined) {
            throw new JmapProtocolError('invalidArguments', 'SetError.properties must be an array of strings or null');
        }

        return new SetError({
            type,
            description: description ?? null,
            properties: propsArray,
        });
    }

    /**
     * Serialises this {@link SetError} to a plain JSON object.
     */
    public toJson(): Record<string, unknown> {
        const json: Record<string, unknown> = {
            type: this.type,
        };
        if (this.description !== null) {
            json['description'] = this.description;
        }
        if (this.properties !== null) {
            json['properties'] = this.properties;
        }
        return json;
    }
}

/**
 * Standard top‑level method‑call error returned as an `'error'` method response.
 */
export class MethodError {
    public readonly type: string;
    public readonly description: string | null;

    /**
     * @param type - Error type identifier (e.g. `unknownMethod`).
     * @param description - Optional human‑readable description.
     */
    constructor(params: {
        type: string;
        description?: string | null;
    }) {
        this.type = params.type;
        this.description = params.description ?? null;
    }

    /**
     * Creates a {@link MethodError} instance from an unknown JSON value.
     *
     * @throws {@link JmapProtocolError} if the input is not a valid MethodError object.
     */
    public static fromJson(data: unknown): MethodError {
        if (typeof data !== 'object' || data === null) {
            throw new JmapProtocolError('invalidArguments', 'MethodError must be an object');
        }
        const obj = data as Record<string, unknown>;

        const type = obj['type'];
        if (typeof type !== 'string') {
            throw new JmapProtocolError('invalidArguments', 'MethodError.type must be a string');
        }

        const description = obj.hasOwnProperty('description')
            ? (obj['description'] as string | null)
            : null;
        if (description !== null && description !== undefined && typeof description !== 'string') {
            throw new JmapProtocolError('invalidArguments', 'MethodError.description must be a string or null');
        }

        return new MethodError({
            type,
            description: description ?? null,
        });
    }

    /**
     * Serialises this {@link MethodError} to a plain JSON object.
     */
    public toJson(): Record<string, unknown> {
        const json: Record<string, unknown> = {
            type: this.type,
        };
        if (this.description !== null) {
            json['description'] = this.description;
        }
        return json;
    }
}

/**
 * A back‑reference used inside a request argument to point at a value produced
 * by an earlier method call in the same request.
 */
export class ResultReference {
    public readonly resultOf: string;
    public readonly name: string;
    public readonly path: string;

    /**
     * @param resultOf - Identifier of the earlier method call.
     * @param name - Name of the result property to reference.
     * @param path - JSON Pointer into the referenced result.
     */
    constructor(params: {
        resultOf: string;
        name: string;
        path: string;
    }) {
        this.resultOf = params.resultOf;
        this.name = params.name;
        this.path = params.path;
    }

    /**
     * Creates a {@link ResultReference} instance from an unknown JSON value.
     *
     * @throws {@link JmapProtocolError} if the input is not a valid ResultReference object.
     */
    public static fromJson(data: unknown): ResultReference {
        if (typeof data !== 'object' || data === null) {
            throw new JmapProtocolError('invalidArguments', 'ResultReference must be an object');
        }
        const obj = data as Record<string, unknown>;

        const resultOf = obj['resultOf'];
        const name = obj['name'];
        const path = obj['path'];

        if (typeof resultOf !== 'string') {
            throw new JmapProtocolError('invalidArguments', 'ResultReference.resultOf must be a string');
        }
        if (typeof name !== 'string') {
            throw new JmapProtocolError('invalidArguments', 'ResultReference.name must be a string');
        }
        if (typeof path !== 'string') {
            throw new JmapProtocolError('invalidArguments', 'ResultReference.path must be a string');
        }

        return new ResultReference({
            resultOf,
            name,
            path,
        });
    }

    /**
     * Serialises this {@link ResultReference} to a plain JSON object.
     */
    public toJson(): Record<string, unknown> {
        return {
            resultOf: this.resultOf,
            name: this.name,
            path: this.path,
        };
    }
}
