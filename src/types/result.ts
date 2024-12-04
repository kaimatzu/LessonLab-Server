/*
 * Custom Error Handling to 'fix' try catch hell in Javascript/Typescript. Errors should be values.
 */

export type ResultType<T> =
    | { success: true; value: T }
    | { success: false; error: Error };

export class Result<T> {
    private constructor(public readonly result: ResultType<T>) {}

    static ok<T>(value: T): Result<T> {
        return new Result<T>({ success: true, value });
    }

    static err<T>(error: Error): Result<T> {
        return new Result<T>({ success: false, error });
    }

    get value(): T | undefined {
        return this.result.success ? this.result.value : undefined;
    }

    get error(): Error | undefined {
        return this.result.success ? undefined : this.result.error;
    }

    isSuccess(): this is { result: { success: true; value: T } } {
        return this.result.success;
    }

    isError(): this is { result: { success: false; error: Error } } {
        return !this.result.success;
    }

    map<U>(fn: (value: T) => U): Result<U> {
        if (this.result.success) {
            return Result.ok(fn(this.result.value));
        } else {
            return Result.err<U>(this.result.error);
        }
    }

    flatMap<U>(fn: (value: T) => Result<U>): Result<U> {
        if (this.result.success) {
            return fn(this.result.value);
        } else {
            return Result.err<U>(this.result.error);
        }
    }

    unwrap(): T {
        if (this.result.success) {
            return this.result.value;
        } else {
            throw new Error(
                "Called unwrap on an error result: " + this.result.error.message
            );
        }
    }

    unwrapOr(defaultValue: T): T {
        return this.result.success ? this.result.value : defaultValue;
    }

    unwrapOrElse(fn: (error: Error) => T): T {
        return this.result.success ? this.result.value : fn(this.result.error);
    }
}