/*
 * Jexl
 * Copyright 2019 Tom Shawver
 */

const Lexer = require('lib/Lexer')
const Parser = require('lib/parser/Parser')
const Evaluator = require('lib/evaluator/Evaluator')
const grammar = require('lib/grammar').elements
const PromiseSync = require('lib/PromiseSync')

const lexer = new Lexer(grammar)

const toTree = (exp) => {
  const p = new Parser(grammar)
  p.addTokens(lexer.tokenize(exp))
  return p.complete()
}

describe('Evaluator', () => {
  it('evaluates using an alternative Promise class', () => {
    const e = new Evaluator(grammar, null, null, null, null, PromiseSync)
    expect(e.eval(toTree('2 + 2'))).toHaveProperty('value', 4)
  })
  it('evaluates an arithmetic expression', async () => {
    const e = new Evaluator(grammar)
    return expect(e.eval(toTree('(2 + 3) * 4'))).resolves.toBe(20)
  })
  it('evaluates a string concat', async () => {
    const e = new Evaluator(grammar)
    return expect(e.eval(toTree('"Hello" + (4+4) + "Wo\\"rld"')))
      .resolves.toBe('Hello8Wo"rld')
  })
  it('evaluates a true comparison expression', async () => {
    const e = new Evaluator(grammar)
    return expect(e.eval(toTree('2 > 1'))).resolves.toBe(true)
  })
  it('evaluates a false comparison expression', async () => {
    const e = new Evaluator(grammar)
    return expect(e.eval(toTree('2 <= 1'))).resolves.toBe(false)
  })
  it('evaluates a complex expression', async () => {
    const e = new Evaluator(grammar)
    return expect(e.eval(toTree('"foo" && 6 >= 6 && 0 + 1 && true')))
      .resolves.toBe(true)
  })
  it('evaluates an identifier chain', async () => {
    const context = { foo: { baz: { bar: 'tek' } } }
    const e = new Evaluator(grammar, null, context)
    const tree = toTree('foo.baz.bar')
    return expect(e.eval(tree)).resolves.toBe(context.foo.baz.bar)
  })
  it('applys transforms', async () => {
    const context = { foo: 10 }
    const half = val => val / 2
    const e = new Evaluator(grammar, { half: half }, context)
    return expect(e.eval(toTree('foo|half + 3'))).resolves.toBe(8)
  })
  it('filters arrays', async () => {
    const context = {
      foo: {
        bar: [
          { tek: 'hello' },
          { tek: 'baz' },
          { tok: 'baz' }
        ]
      }
    }
    const e = new Evaluator(grammar, null, context)
    return expect(e.eval(toTree('foo.bar[.tek == "baz"]'))).resolves.toEqual([{ tek: 'baz' }])
  })
  it('assumes array index 0 when traversing', async () => {
    const context = {
      foo: {
        bar: [
          { tek: { hello: 'world' } },
          { tek: { hello: 'universe' } }
        ]
      }
    }
    const e = new Evaluator(grammar, null, context)
    return expect(e.eval(toTree('foo.bar.tek.hello'))).resolves.toBe('world')
  })
  it('makes array elements addressable by index', async () => {
    const context = {
      foo: {
        bar: [
          { tek: 'tok' },
          { tek: 'baz' },
          { tek: 'foz' }
        ]
      }
    }
    const e = new Evaluator(grammar, null, context)
    return expect(e.eval(toTree('foo.bar[1].tek'))).resolves.toBe('baz')
  })
  it('allows filters to select object properties', async () => {
    const context = { foo: { baz: { bar: 'tek' } } }
    const e = new Evaluator(grammar, null, context)
    return expect(e.eval(toTree('foo["ba" + "z"].bar'))).resolves.toBe(context.foo.baz.bar)
  })
  it('throws when transform does not exist', async () => {
    const e = new Evaluator(grammar)
    return expect(e.eval(toTree('"hello"|world'))).rejects.toThrow(Error)
  })
  it('applys the DivFloor operator', async () => {
    const e = new Evaluator(grammar)
    return expect(e.eval(toTree('7 // 2'))).resolves.toBe(3)
  })
  it('evaluates an object literal', async () => {
    const e = new Evaluator(grammar)
    return expect(e.eval(toTree('{foo: {bar: "tek"}}'))).resolves.toEqual({ foo: { bar: 'tek' } })
  })
  it('evaluates an empty object literal', async () => {
    const e = new Evaluator(grammar)
    return expect(e.eval(toTree('{}'))).resolves.toEqual({})
  })
  it('evaluates a transform with multiple args', async () => {
    const e = new Evaluator(grammar, {
      concat: (val, a1, a2, a3) => val + ': ' + a1 + a2 + a3
    })
    return expect(e.eval(toTree('"foo"|concat("baz", "bar", "tek")'))).resolves.toBe('foo: bazbartek')
  })
  it('evaluates dot notation for object literals', async () => {
    const e = new Evaluator(grammar)
    return expect(e.eval(toTree('{foo: "bar"}.foo'))).resolves.toBe('bar')
  })
  it('allows access to literal properties', async () => {
    const e = new Evaluator(grammar)
    return expect(e.eval(toTree('"foo".length'))).resolves.toBe(3)
  })
  it('evaluates array literals', async () => {
    const e = new Evaluator(grammar)
    return expect(e.eval(toTree('["foo", 1+2]'))).resolves.toEqual(['foo', 3])
  })
  it('applys the "in" operator to strings', async () => {
    const e = new Evaluator(grammar)
    return Promise.all([
      expect(e.eval(toTree('"bar" in "foobartek"'))).resolves.toBe(true),
      expect(e.eval(toTree('"baz" in "foobartek"'))).resolves.toBe(false)
    ])
  })
  it('applys the "in" operator to arrays', async () => {
    const e = new Evaluator(grammar)
    return Promise.all([
      expect(e.eval(toTree('"bar" in ["foo","bar","tek"]'))).resolves.toBe(true),
      expect(e.eval(toTree('"baz" in ["foo","bar","tek"]'))).resolves.toBe(false)
    ])
  })
  it('evaluates a conditional expression', async () => {
    const e = new Evaluator(grammar)
    return Promise.all([
      expect(e.eval(toTree('"foo" ? 1 : 2'))).resolves.toBe(1),
      expect(e.eval(toTree('"" ? 1 : 2'))).resolves.toBe(2)
    ])
  })
  it('allows missing consequent in ternary', async () => {
    const e = new Evaluator(grammar)
    return expect(e.eval(toTree('"foo" ?: "bar"'))).resolves.toBe('foo')
  })
  it('does not treat falsey properties as undefined', async () => {
    const e = new Evaluator(grammar)
    const tree = toTree('"".length')
    return expect(e.eval(tree)).resolves.toBe(0)
  })
  it('returns empty array when applying a filter to an undefined value', async () => {
    const e = new Evaluator(grammar, null, { a: {}, d: 4 })
    return expect(e.eval(toTree('a.b[.c == d]'))).resolves.toHaveLength(0)
  })
  it('returns null when selecting an object property from a filter of an undefined value', async () => {
    const e = new Evaluator(grammar, null, { a: {}, d: 4 })
    return expect(e.eval(toTree('a.b[.c == d].value'))).resolves.toBe(null)
  })
  it('resolves the parent context', async () => {
    const context = { foo1: { baz1: { bar1: 'ket' } } }
    const parentMap = new Map()
    const parent = { startAt: context, sibling: { name: 'oof' } }
    parentMap.set(context, parent)
    const e = new Evaluator(grammar, null, context, null, parentMap)
    return expect(e.eval(toTree('../'))).resolves.toBe(parent)
  })
  it('evaluates values from parent of the context', async () => {
    const context = { foo1: { baz1: { bar1: 'ket' } } }
    const parentMap = new Map()
    parentMap.set(context, { startAt: context, sibling: { name: 'oof' } })
    const e = new Evaluator(grammar, null, context, null, parentMap)
    return expect(e.eval(toTree('../sibling.name'))).resolves.toEqual('oof')
  })
  it('evaluates values from parent of the context', async () => {
    const context = { list: ['a', 'b', 'c', 'd'] }
    const transforms = {
      map: function (arr, mapFn) {
        return arr.map(mapFn);
      },
      upper: function(str) {
        return str.toUpperCase()
      }
    }
    const e = new Evaluator(grammar, transforms, context, null)
    return expect(e.eval(toTree('list|map(fn(val, idx)=>val|upper+"-"+idx)'))).resolves.toEqual(["A-0", "B-1", "C-2", "D-3"])
  })
})
