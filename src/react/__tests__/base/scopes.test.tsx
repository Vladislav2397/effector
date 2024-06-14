import React from 'react'
//@ts-expect-error
import {render, container, act} from 'effector/fixtures/react'
import {argumentHistory, muteErrors} from 'effector/fixtures'
import {
  createDomain,
  createEvent,
  createStore,
  createEffect,
  sample,
  attach,
  fork,
  allSettled,
  serialize,
  Scope,
} from 'effector'

import {
  Provider,
  useList,
  useGate,
  useStoreMap,
  createGate,
  useUnit,
} from 'effector-react'

muteErrors(['No scope found', 'AppFail'])

async function request(url: string) {
  const users: Record<string, {name: string; friends: string[]}> = {
    alice: {
      name: 'alice',
      friends: ['bob', 'carol'],
    },
    bob: {
      name: 'bob',
      friends: ['alice'],
    },
    carol: {
      name: 'carol',
      friends: ['alice'],
    },
    charlie: {
      name: 'charlie',
      friends: [],
    },
  }
  const user = url.replace('https://ssr.effector.dev/api/', '')
  const result = users[user]
  await new Promise(rs => setTimeout(rs, 30))
  return result
}

it('works', async () => {
  const indirectCallFn = jest.fn()

  const start = createEvent<string>()
  const indirectCall = createEvent()
  const sendStats = createEffect(async (user: any) => {
    await new Promise(resolve => {
      // let bob loading longer
      setTimeout(resolve, user === 'bob' ? 500 : 100)
    })
  })

  const fetchUser = createEffect(async (user: any) => {
    return request('https://ssr.effector.dev/api/' + user)
  })
  //assume that calling start() will trigger some effects
  sample({
    clock: start,
    target: fetchUser,
  })

  const user = createStore('guest', {sid: 'user'})
  const friends = createStore<string[]>([], {sid: 'friends'})
  const friendsTotal = friends.map(list => list.length)

  user.on(fetchUser.doneData, (_, result) => result.name)
  friends.on(fetchUser.doneData, (_, result) => result.friends)

  sample({
    source: user,
    clock: fetchUser.done,
    target: sendStats,
  })
  sample({
    source: user,
    clock: indirectCall,
  }).watch(indirectCallFn)

  sendStats.done.watch(() => {
    indirectCall()
  })

  const aliceScope = fork()
  const bobScope = fork()
  const carolScope = fork()
  await Promise.all([
    allSettled(start, {
      scope: aliceScope,
      params: 'alice',
    }),
    allSettled(start, {
      scope: bobScope,
      params: 'bob',
    }),
    allSettled(start, {
      scope: carolScope,
      params: 'carol',
    }),
  ])
  const User = () => <h2>{useUnit(user)}</h2>
  const Friends = () => useList(friends, friend => <li>{friend}</li>)
  const Total = () => <small>Total: {useUnit(friendsTotal)}</small>

  const App = ({root}: {root: Scope}) => (
    <Provider value={root}>
      <User />
      <b>Friends:</b>
      <ol>
        <Friends />
      </ol>
      <Total />
    </Provider>
  )

  await render(<App root={bobScope} />)
  expect(container.firstChild).toMatchInlineSnapshot(`
    <h2>
      bob
    </h2>
  `)

  expect(serialize(aliceScope)).toMatchInlineSnapshot(`
    Object {
      "friends": Array [
        "bob",
        "carol",
      ],
      "user": "alice",
    }
  `)
  expect(serialize(bobScope)).toMatchInlineSnapshot(`
    Object {
      "friends": Array [
        "alice",
      ],
      "user": "bob",
    }
  `)
  expect(indirectCallFn).toBeCalled()
})

test('attach support', async () => {
  const indirectCallFn = jest.fn()

  const start = createEvent<string>()
  const indirectCall = createEvent()
  const sendStats = createEffect(async (user: string) => {
    await new Promise(resolve => {
      // let bob loading longer
      setTimeout(resolve, user === 'bob' ? 500 : 100)
    })
  })

  const baseUrl = createStore('https://ssr.effector.dev/api')

  const fetchJson = createEffect<string, any>(async url => await request(url))

  const fetchUser = attach({
    source: {baseUrl},
    effect: fetchJson,
    mapParams: (user, {baseUrl}) => `${baseUrl}/${user}`,
  })

  sample({
    clock: start,
    target: fetchUser,
  })

  const user = createStore('guest', {sid: 'user'})
  const friends = createStore([], {sid: 'friends'})
  const friendsTotal = friends.map(list => list.length)

  user.on(fetchUser.doneData, (_, result) => result.name)
  friends.on(fetchUser.doneData, (_, result) => result.friends)

  sample({
    source: user,
    clock: fetchUser.done,
    target: sendStats,
  })
  sample({
    source: user,
    clock: indirectCall,
  }).watch(indirectCallFn)

  sendStats.done.watch(() => {
    indirectCall()
  })

  const aliceScope = fork()
  const bobScope = fork()
  const carolScope = fork()
  await Promise.all([
    allSettled(start, {
      scope: aliceScope,
      params: 'alice',
    }),
    allSettled(start, {
      scope: bobScope,
      params: 'bob',
    }),
    allSettled(start, {
      scope: carolScope,
      params: 'carol',
    }),
  ])
  const User = () => <h2>{useUnit(user)}</h2>
  const Friends = () => useList(friends, friend => <li>{friend}</li>)
  const Total = () => <small>Total: {useUnit(friendsTotal)}</small>

  const App = ({root}: {root: Scope}) => (
    <Provider value={root}>
      <User />
      <b>Friends:</b>
      <ol>
        <Friends />
      </ol>
      <Total />
    </Provider>
  )

  await render(<App root={bobScope} />)
  expect(container.firstChild).toMatchInlineSnapshot(`
    <h2>
      bob
    </h2>
  `)
  expect(serialize(aliceScope)).toMatchInlineSnapshot(`
    Object {
      "friends": Array [
        "bob",
        "carol",
      ],
      "user": "alice",
    }
  `)
  expect(serialize(bobScope)).toMatchInlineSnapshot(`
    Object {
      "friends": Array [
        "alice",
      ],
      "user": "bob",
    }
  `)
  expect(indirectCallFn).toBeCalled()
})

test('computed values support', async () => {
  const fetchUser = createEffect<string, {name: string; friends: string[]}>(
    async user => await request(`https://ssr.effector.dev/api/${user}`),
  )
  const start = createEvent<string>()
  sample({clock: start, target: fetchUser})
  const name = createStore('guest').on(
    fetchUser.done,
    (_, {result}) => result.name,
  )

  const friends = createStore<string[]>([]).on(
    fetchUser.done,
    (_, {result}) => result.friends,
  )
  const friendsTotal = friends.map(list => list.length)

  const Total = () => <small>Total:{useUnit(friendsTotal)}</small>
  const User = () => <b>User:{useUnit(name)}</b>
  const App = ({root}: {root: Scope}) => (
    <Provider value={root}>
      <section>
        <User />
        <Total />
      </section>
    </Provider>
  )

  const serverScope = fork()
  await allSettled(start, {
    scope: serverScope,
    params: 'alice',
  })

  const clientScope = fork({
    values: serialize(serverScope),
  })

  await render(<App root={clientScope} />)

  expect(container.firstChild).toMatchInlineSnapshot(`
    <section>
      <b>
        User:
        alice
      </b>
      <small>
        Total:
        2
      </small>
    </section>
  `)
})

test('useGate support', async () => {
  const getMessagesFx = createEffect<{chatId: string}, string[]>(
    async ({chatId}) => {
      return ['hi bob!', 'Hello, Alice']
    },
  )

  const messagesAmount = createStore(0).on(
    getMessagesFx.doneData,
    (_, messages) => messages.length,
  )

  const activeChatGate = createGate<{chatId: string}>({})

  sample({clock: activeChatGate.open, target: getMessagesFx})

  const ChatPage = ({chatId}: {chatId: string}) => {
    useGate(activeChatGate, {chatId})
    return (
      <div>
        <header>Chat:{chatId}</header>
        <p>Messages total:{useUnit(messagesAmount)}</p>
      </div>
    )
  }
  const App = ({root}: {root: Scope}) => (
    <Provider value={root}>
      <ChatPage chatId="chat01" />
    </Provider>
  )

  const serverScope = fork()
  await render(<App root={serverScope} />)

  expect(container.firstChild).toMatchInlineSnapshot(`
    <div>
      <header>
        Chat:
        chat01
      </header>
      <p>
        Messages total:
        2
      </p>
    </div>
  `)

  const clientScope = fork({
    values: serialize(serverScope),
  })

  await render(<App root={clientScope} />)

  expect(container.firstChild).toMatchInlineSnapshot(`
    <div>
      <header>
        Chat:
        chat01
      </header>
      <p>
        Messages total:
        2
      </p>
    </div>
  `)
})

test('allSettled effect calls', async () => {
  const fn = jest.fn()

  const fetchUser = createEffect<string, {name: string; friends: string[]}>(
    async user => await request(`https://ssr.effector.dev/api/${user}`),
  )

  const serverScope = fork()

  await allSettled(fetchUser, {
    scope: serverScope,
    params: 'alice',
  })
    .then(fn)
    .catch(err => {
      console.error(err)
    })
  expect(fn).toBeCalled()
})
describe('useStoreMap', () => {
  it('should render', async () => {
    const userRemove = createEvent<string>()
    const userAgeChange = createEvent<{nickname: string; age: number}>()
    const $users = createStore<Record<string, {age: number; name: string}>>({
      alex: {age: 20, name: 'Alex'},
      john: {age: 30, name: 'John'},
    })
    const $userNames = createStore(['alex', 'john'])

    $userNames.on(userRemove, (list, username) =>
      list.filter(item => item !== username),
    )
    $users
      .on(userRemove, (users, nickname) => {
        const upd = {...users}
        delete upd[nickname]
        return upd
      })
      .on(userAgeChange, (users, {nickname, age}) => ({
        ...users,
        [nickname]: {...users[nickname], age},
      }))

    const Card = ({nickname}: {nickname: string}) => {
      const {name, age} = useStoreMap({
        store: $users,
        keys: [nickname],
        fn: (users, [nickname]) => users[nickname],
      })
      return (
        <li>
          {name}: {age}
        </li>
      )
    }

    const Cards = () => (
      <ul>
        {useList($userNames, name => (
          <Card nickname={name} key={name} />
        ))}
      </ul>
    )

    const App = ({root}: {root: Scope}) => (
      <Provider value={root}>
        <Cards />
      </Provider>
    )

    const scope = fork()

    await render(<App root={scope} />)
    expect(container.firstChild).toMatchInlineSnapshot(`
      <ul>
        <li>
          Alex
          : 
          20
        </li>
        <li>
          John
          : 
          30
        </li>
      </ul>
    `)
    await act(async () => {
      await allSettled(userAgeChange, {
        scope,
        params: {nickname: 'alex', age: 21},
      })
    })

    expect(container.firstChild).toMatchInlineSnapshot(`
      <ul>
        <li>
          Alex
          : 
          21
        </li>
        <li>
          John
          : 
          30
        </li>
      </ul>
    `)
    await act(async () => {
      await allSettled(userRemove, {scope, params: 'alex'})
    })
    expect(container.firstChild).toMatchInlineSnapshot(`
      <ul>
        <li>
          John
          : 
          30
        </li>
      </ul>
    `)
  })
  it('should support domains', async () => {
    const app = createDomain()
    const toggle = app.createEvent()
    const inc = app.createEvent()
    const $show = app
      .createStore('A')
      .on(toggle, current => (current === 'A' ? 'B' : 'A'))
    const $a = app.createStore(10).on(inc, x => x + 1)
    const $b = app.createStore(20).on(inc, x => x + 1)
    const View = () => {
      const current = useUnit($show)
      const selectedStore = current === 'A' ? $a : $b
      const value = useStoreMap({
        store: selectedStore,
        keys: [selectedStore],
        fn: x => x,
      })
      return <div>{value}</div>
    }
    const App = ({root}: {root: Scope}) => (
      <Provider value={root}>
        <View />
      </Provider>
    )

    const scope = fork()
    await render(<App root={scope} />)
    expect(container.firstChild).toMatchInlineSnapshot(`
      <div>
        10
      </div>
    `)
    await act(async () => {
      await allSettled(inc, {scope})
    })
    expect(container.firstChild).toMatchInlineSnapshot(`
      <div>
        11
      </div>
    `)
    await act(async () => {
      await allSettled(toggle, {scope})
    })
    expect(container.firstChild).toMatchInlineSnapshot(`
      <div>
        21
      </div>
    `)
    await act(async () => {
      await allSettled(inc, {scope})
    })
    expect(container.firstChild).toMatchInlineSnapshot(`
      <div>
        22
      </div>
    `)
    await act(async () => {
      await allSettled(toggle, {scope})
    })
    expect(container.firstChild).toMatchInlineSnapshot(`
      <div>
        12
      </div>
    `)
  })
  test('updateFilter support', async () => {
    const setValue = createEvent<number>()
    const $store = createStore(0).on(setValue, (_, x) => x)

    const View = () => {
      const x = useStoreMap({
        store: $store,
        keys: [],
        fn: x => x,
        updateFilter: (update: number, current: number) => update % 2 === 0,
      })
      return <div>{x}</div>
    }
    const App = ({root}: {root: Scope}) => (
      <Provider value={root}>
        <View />
      </Provider>
    )
    const scope = fork()

    await render(<App root={scope} />)
    expect(container.firstChild).toMatchInlineSnapshot(`
      <div>
        0
      </div>
    `)
    await act(async () => {
      await allSettled(setValue, {scope, params: 2})
    })
    expect(container.firstChild).toMatchInlineSnapshot(`
      <div>
        2
      </div>
    `)
    await act(async () => {
      await allSettled(setValue, {scope, params: 3})
    })
    expect(container.firstChild).toMatchInlineSnapshot(`
      <div>
        2
      </div>
    `)
  })
})

describe('behavior on scope changes', () => {
  test('useStoreMap should not stale', async () => {
    const inc = createEvent()
    const $store = createStore(0).on(inc, x => x + 1)
    const Count = () => {
      const value = useStoreMap($store, n => n)
      return <p>{value}</p>
    }
    const Inc = () => {
      const boundInc = useUnit(inc)
      return (
        <button id="click" onClick={() => boundInc()}>
          click
        </button>
      )
    }
    const App = ({scope}: {scope: Scope}) => (
      <Provider value={scope}>
        <div>
          <Count />
          <Inc />
        </div>
      </Provider>
    )
    const firstScope = fork()
    const secondScope = fork({values: [[$store, 2]]})

    await render(<App scope={firstScope} />)
    await render(<App scope={secondScope} />)

    await act(async () => {
      container.firstChild.querySelector('#click').click()
    })

    expect(secondScope.getState($store)).toBe(3)
    expect(container.firstChild).toMatchInlineSnapshot(`
      <div>
        <p>
          3
        </p>
        <button
          id="click"
        >
          click
        </button>
      </div>
    `)
  })
  test('useList should not stale', async () => {
    const inc = createEvent()
    const $store = createStore([0]).on(inc, ([x]) => [x + 1])
    const Count = () => useList($store, value => <p>{value}</p>)
    const Inc = () => {
      const boundInc = useUnit(inc)
      return (
        <button id="click" onClick={() => boundInc()}>
          click
        </button>
      )
    }
    const App = ({scope}: {scope: Scope}) => (
      <Provider value={scope}>
        <div>
          <Count />
          <Inc />
        </div>
      </Provider>
    )
    const firstScope = fork()
    const secondScope = fork({values: [[$store, [2]]]})

    await render(<App scope={firstScope} />)
    await render(<App scope={secondScope} />)

    await act(async () => {
      container.firstChild.querySelector('#click').click()
    })

    expect(container.firstChild).toMatchInlineSnapshot(`
      <div>
        <p>
          3
        </p>
        <button
          id="click"
        >
          click
        </button>
      </div>
    `)
  })
  test('useUnit should not stale', async () => {
    const inc = createEvent()
    const $store = createStore(0).on(inc, x => x + 1)
    const Count = () => {
      const value = useUnit($store)
      return <p>{value}</p>
    }
    const Inc = () => {
      const boundInc = useUnit(inc)
      return (
        <button id="click" onClick={() => boundInc()}>
          click
        </button>
      )
    }
    const App = ({scope}: {scope: Scope}) => (
      <Provider value={scope}>
        <div>
          <Count />
          <Inc />
        </div>
      </Provider>
    )
    const firstScope = fork()
    const secondScope = fork({values: [[$store, 2]]})

    await render(<App scope={firstScope} />)
    await render(<App scope={secondScope} />)

    await act(async () => {
      container.firstChild.querySelector('#click').click()
    })

    expect(secondScope.getState($store)).toBe(3)
    expect(container.firstChild).toMatchInlineSnapshot(`
      <div>
        <p>
          3
        </p>
        <button
          id="click"
        >
          click
        </button>
      </div>
    `)
  })
})

test('useUnit should bind stores to scope', async () => {
  const $a = createStore(0)

  const A = () => {
    const {a} = useUnit({a: $a})
    return <>{a}</>
  }
  const App = ({scope}: {scope: Scope}) => (
    <Provider value={scope}>
      <div>
        <A />
      </div>
    </Provider>
  )

  const scopeA = fork({
    values: [[$a, 42]],
  })
  const scopeB = fork()

  await render(<App scope={scopeA} />)
  expect(container.firstChild).toMatchInlineSnapshot(`
    <div>
      42
    </div>
  `)

  await render(<App scope={scopeB} />)
  expect(container.firstChild).toMatchInlineSnapshot(`
    <div>
      0
    </div>
  `)
})

test('useUnit should bind units to scope', async () => {
  const up = createEvent()
  const $a = createStore(0).on(up, s => s + 1)

  const A = ({id}: {id: string}) => {
    const {a, inc} = useUnit({a: $a, inc: up})

    return (
      <button id={id} onClick={() => inc()}>
        {a}
      </button>
    )
  }
  const App = ({scope, id}: {scope: Scope; id: string}) => (
    <Provider value={scope}>
      <A id={id} />
    </Provider>
  )
  const Page = ({A, B}: {A: Scope; B: Scope}) => {
    return (
      <div>
        <App scope={A} id="a" />
        <App scope={B} id="b" />
      </div>
    )
  }

  const VALUE = 42

  const scopeA = fork({
    values: [[$a, VALUE]],
  })
  const scopeB = fork()

  await render(<Page A={scopeA} B={scopeB} />)
  expect(container.firstChild).toMatchInlineSnapshot(`
    <div>
      <button
        id="a"
      >
        42
      </button>
      <button
        id="b"
      >
        0
      </button>
    </div>
  `)

  await act(async () => {
    container.firstChild.querySelector('#a').click()
  })
  expect(container.firstChild).toMatchInlineSnapshot(`
    <div>
      <button
        id="a"
      >
        43
      </button>
      <button
        id="b"
      >
        0
      </button>
    </div>
  `)
  expect(scopeA.getState($a)).toEqual(VALUE + 1)
  expect(scopeB.getState($a)).toEqual(0)
  expect($a.getState()).toEqual(0)
})

describe('hooks throw errors, if Provider is not found', () => {
  test('useUnit from `effector-react` throws error, if no Provider', () => {
    const $a = createStore(42)

    const AppFail = () => {
      const a = useUnit($a, {forceScope: true})

      return <div>{a}</div>
    }

    expect(() => render(<AppFail />)).rejects.toThrow(
      'No scope found, consider adding <Provider> to app root',
    )
  })

  test('useStoreMap from `effector-react` throws error, if no Provider', () => {
    const $a = createStore(42)

    const AppFail = () => {
      const a = useStoreMap({
        store: $a,
        keys: [],
        fn: () => 42,
        defaultValue: 77,
        forceScope: true,
      })

      return <div>{a}</div>
    }

    expect(() => render(<AppFail />)).rejects.toThrow(
      'No scope found, consider adding <Provider> to app root',
    )
  })

  test('useList from `effector-react` throws error, if no Provider', () => {
    const $a = createStore([42])

    const AppFail = () => {
      const a = useList(
        $a,
        {
          fn: () => <div>42</div>,
        },
        {forceScope: true},
      )

      return <div>{a}</div>
    }

    expect(() => render(<AppFail />)).rejects.toThrow(
      'No scope found, consider adding <Provider> to app root',
    )
  })
})
