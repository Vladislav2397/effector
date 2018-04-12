
import {Stream} from 'most'

type Tag = string
type ID = number

export type WarnMode = 'off' | 'warn' | 'throw'
export type EventConfig = {
  unused?: WarnMode,
  watchFailCheck?: WarnMode,
}

export type Meta = {
  index: ID,
  eventID: ID,
  seq: ID,
  passed: boolean,
  plain?: boolean,
}

export type RawAction<P> = {
  type: string | Tag,
  payload: P,
  meta: Meta,
}

export type Middleware<S> = (api: {
 getState: () => S,
 dispatch: (action: any) => any,
}) => (next: any) => any


export type Subscription = {
  unsubscribe(): void,
}

export type Subscriber<A> = {
  next(value: A): void,
  // error(err: Error): void,
  complete(): void,
}

export type Store<T> = {
 subscribe(listner: () => void): () => void,
 replaceReducer(nextReducer: (_: T, p: any) => T): void,
 getState(): T,
 dispatch: (action: any) => any,
}

export type Reducer<S> = {
  (state: S, action: RawAction<any>): S,
  options(opts: { fallback: boolean }): Reducer<S>,
  has(event: Event<any, any>): boolean,
  on<
    P,
    A extends Event<P, any>
  >(event: A | A[], handler: (state: S, payload: P, meta: Meta) => S): Reducer<S>,
  off<A extends Event<any, any>>(event: A): Reducer<S>,
  reset<A extends Event<any, any>>(event: A | A[]): Reducer<S>,
  subscribe(subscriber: Subscriber<S>): Subscription,
}

export type Domain<State = void> = {
  effect<Params, Done, Fail>(
    name: string,
    options?: EventConfig,
  ): Effect<Params, Done, Fail, State>,
  event<Payload>(
    name: string
  ): Event<Payload, State>,
  domain(name: string): Domain<State>,
  typeConstant<Payload>(
    name: string
  ): Event<Payload, State>,
  register(store: Store<State>): void,
  port<R>(events$: Stream<R>): Promise<void>,
}

export type Event<Payload, State> = {
  (params: Payload): {
    send(): Promise<Payload>,
    raw(): RawAction<Payload>,
  },
  getType(): Tag,
  watch<R>(fn: (params: Payload, state: State) => R): void,
  epic<R>(
    handler: (
      data$: Stream<Payload>,
      state$: Stream<State>
    ) => Stream<R>
  ): Stream<R>,
  trigger(
    query: (state: State) => Payload,
    eventName?: string,
  ): Event<void, State>,
  subscribe(subscriber: Subscriber<Payload>): Subscription,
}

export type Effect<Params, Done, Fail, State> = {
  (params: Params): {
    raw(): RawAction<Params>,
    send(dispatchHook?: <T>(value: T) => T): Promise<Params>,
    done(): Promise<{params: Params, result: Done}>,
    fail(): Promise<{params: Params, error: Fail}>,
    promise(): Promise<{params: Params, result: Done}>,
  },
  getType(): Tag,
  watch<R>(fn: (params: Params, state: State) => R): void,
  epic<R>(
    handler: (
      data$: Stream<Params>,
      state$: Stream<State>
    ) => Stream<R>
  ): Stream<R>,
  use(thunk: (params: Params) => Promise<Done>): void,
  trigger(
    query: (state: State) => Params,
    eventName?: string,
  ): Event<void, State>,
  done: Event<{params: Params, result: Done}, State>,
  fail: Event<{params: Params, error: Fail}, State>,
  subscribe(subscriber: Subscriber<Params>): Subscription,
}

export type DomainAuto = Domain<any>
export type EventAuto<Payload> = Event<Payload, any>
export type EffectAuto<Params, Done, Fail = Error> =
  Effect<Params, Done, Fail, any>

export function createStore<T>(
 reducer: (store: T, payload: any) => T,
 enhancerRaw: Function | Function[],
 none: void,
): Store<T>
export function createStore<T>(
 reducer: (store: T, payload: any) => T,
 preloadedStateRaw?: T,
 enhancerRaw: Function | Function[],
): Store<T>

export function createReducer<S>(defaultState: S): Reducer<S>

export function createEvent<Payload>(
  name: string,
): EventAuto<Payload>

export function createEffect<Params, Done, Fail>(
  name: string,
): EffectAuto<Params, Done, Fail>

export function createHaltAction(): RawAction<void>

export function createDomain<State>(store: Store<State>, domainName?: string): Domain<State>

export function createRootDomain<State>(domainName?: string): Domain<State>

export const effectorMiddleware: Middleware


export function combine<A, R>(
 fn: (a: A) => R,
 a: Reducer<A>,
 ...none: Array<void>
): Reducer<R>
export function combine<A, B, R>(
 fn: (a: A, b: B) => R,
 a: Reducer<A>,
 b: Reducer<B>,
 ...none: Array<void>
): Reducer<R>
export function combine<A, B, C, R>(
 fn: (a: A, b: B, c: C) => R,
 a: Reducer<A>,
 b: Reducer<B>,
 c: Reducer<C>,
 ...none: Array<void>
): Reducer<R>
export function combine<A, B, C, D, R>(
 fn: (a: A, b: B, c: C, d: D) => R,
 a: Reducer<A>,
 b: Reducer<B>,
 c: Reducer<C>,
 d: Reducer<D>,
 ...none: Array<void>
): Reducer<R>
export function combine<A, B, C, D, E, R>(
 fn: (a: A, b: B, c: C, d: D, e: E) => R,
 a: Reducer<A>,
 b: Reducer<B>,
 c: Reducer<C>,
 d: Reducer<D>,
 e: Reducer<E>,
 ...none: Array<void>
): Reducer<R>
export function combine<A, B, C, D, E, F, R>(
 fn: (a: A, b: B, c: C, d: D, e: E, f: F) => R,
 a: Reducer<A>,
 b: Reducer<B>,
 c: Reducer<C>,
 d: Reducer<D>,
 e: Reducer<E>,
 f: Reducer<F>,
 ...none: Array<void>
): Reducer<R>
export function combine<A, B, C, D, E, F, G, R>(
 fn: (a: A, b: B, c: C, d: D, e: E, f: F, g: G) => R,
 a: Reducer<A>,
 b: Reducer<B>,
 c: Reducer<C>,
 d: Reducer<D>,
 e: Reducer<E>,
 f: Reducer<F>,
 g: Reducer<G>,
 ...none: Array<void>
): Reducer<R>
export function combine<A, B, C, D, E, F, G, H, R>(
 fn: (a: A, b: B, c: C, d: D, e: E, f: F, g: G, h: H) => R,
 a: Reducer<A>,
 b: Reducer<B>,
 c: Reducer<C>,
 d: Reducer<D>,
 e: Reducer<E>,
 f: Reducer<F>,
 g: Reducer<G>,
 h: Reducer<H>,
 ...none: Array<void>
): Reducer<R>
export function combine<A, B, C, D, E, F, G, H, I, R>(
 fn: (a: A, b: B, c: C, d: D, e: E, f: F, g: G, h: H, i: I) => R,
 a: Reducer<A>,
 b: Reducer<B>,
 c: Reducer<C>,
 d: Reducer<D>,
 e: Reducer<E>,
 f: Reducer<F>,
 g: Reducer<G>,
 h: Reducer<H>,
 h: Reducer<H>,
 i: Reducer<I>,
 ...none: Array<void>
): Reducer<R>
export function combine<A, B, C, D, E, F, G, H, I, J, R>(
 fn: (a: A, b: B, c: C, d: D, e: E, f: F, g: G, h: H, i: I, j: J) => R,
 a: Reducer<A>,
 b: Reducer<B>,
 c: Reducer<C>,
 d: Reducer<D>,
 e: Reducer<E>,
 f: Reducer<F>,
 g: Reducer<G>,
 h: Reducer<H>,
 h: Reducer<H>,
 i: Reducer<I>,
 j: Reducer<J>,
 ...none: Array<void>
): Reducer<R>
export function combine<A, B, C, D, E, F, G, H, I, J, K, R>(
 fn: (a: A, b: B, c: C, d: D, e: E, f: F, g: G, h: H, i: I, j: J, k: K) => R,
 a: Reducer<A>,
 b: Reducer<B>,
 c: Reducer<C>,
 d: Reducer<D>,
 e: Reducer<E>,
 f: Reducer<F>,
 g: Reducer<G>,
 h: Reducer<H>,
 h: Reducer<H>,
 i: Reducer<I>,
 j: Reducer<J>,
 k: Reducer<K>,
 ...none: Array<void>
): Reducer<R>


export function collect(): Collect

export type CollectType<
  A = any,
  B = any,
  C = any,
  D = any,
> = Collect
  | CollectA<A>
  | CollectAB<A, B>
  | CollectABC<A, B, C>
  | CollectABCD<A, B, C, D>

declare class Collect {
  and<A>(red: Reducer<A>): CollectA<A>;
  combine<R>(fn: () => R): Reducer<R>;
}

declare class CollectA<A> {
  and<B>(red: Reducer<B>): CollectAB<A, B>;
  combine<R>(fn: (a: A) => R): Reducer<R>;
}

declare class CollectAB<A, B> {
  and<C>(red: Reducer<C>): CollectABC<A, B, C>;
  combine<R>(fn: (a: A, b: B) => R): Reducer<R>;
}

declare class CollectABC<A, B, C> {
  and<D>(red: Reducer<D>): CollectABCD<A, B, C, D>;
  combine<R>(fn: (a: A, b: B, c: C) => R): Reducer<R>;
}

declare class CollectABCD<A, B, C, D> {
  // and<D>(red: Reducer<D>): CollectABCD<A, B, C, D>;
  combine<R>(fn: (a: A, b: B, c: C, d: D) => R): Reducer<R>;
}
