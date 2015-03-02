/*
 * Jexl
 * Copyright (c) 2015 TechnologyAdvice
 */

var chai = require('chai'),
	chaiAsPromised = require('chai-as-promised'),
	should = require('chai').should(),
	Lexer = require('../lib/Lexer'),
	Parser = require('../lib/Parser'),
	Evaluator = require('../lib/Evaluator');

chai.use(chaiAsPromised);

function toTree(exp) {
	var p = new Parser();
	p.addTokens(Lexer.tokenize(exp));
	return p.complete();
}

describe('Evaluator', function() {
	it('should evaluate an arithmetic expression', function() {
		var e = new Evaluator();
		return e.eval(toTree('(2 + 3) * 4')).should.become(20);
	});
	it('should evaluate a string concat', function() {
		var e = new Evaluator();
		return e.eval(toTree('"Hello" + (4+4) + "Wo\\"rld"'))
			.should.become('Hello8Wo"rld');
	});
	it('should evaluate a true comparison expression', function() {
		var e = new Evaluator();
		return e.eval(toTree('2 > 1')).should.become(true);
	});
	it('should evaluate a false comparison expression', function() {
		var e = new Evaluator();
		return e.eval(toTree('2 <= 1')).should.become(false);
	});
	it('should evaluate a complex expression', function() {
		var e = new Evaluator();
		return e.eval(toTree('"foo" && 6 >= 6 && 0 + 1 && true'))
			.should.become(true);
	});
	it('should evaluate an identifier chain', function() {
		var context = {foo: {baz: {bar: 'tek'}}},
			e = new Evaluator(null, context);
		return e.eval(toTree('foo.baz.bar'))
			.should.become(context.foo.baz.bar);
	});
	it('should apply transforms', function() {
		var context = {foo: 10},
			half = function(val) {
				return val / 2;
			},
			e = new Evaluator({half: half}, context);
		return e.eval(toTree('foo|half + 3')).should.become(8);
	});
	it('should filter arrays', function() {
		var context = {foo: {bar: [
				{tek: 'hello'},
				{tek: 'baz'},
				{tok: 'baz'}
			]}},
			e = new Evaluator(null, context);
		return e.eval(toTree('foo.bar[.tek == "baz"]'))
			.should.eventually.deep.equal([{tek: 'baz'}]);
	});
	it('should assume array index 0 when traversing', function() {
		var context = {foo: {bar: [
				{tek: {hello: 'world'}},
				{tek: {hello: 'universe'}}
			]}},
			e = new Evaluator(null, context);
		return e.eval(toTree('foo.bar.tek.hello')).should.become('world');
	});
	it('should make array elements addressable by index', function() {
		var context = {foo: {bar: [
				{tek: 'tok'},
				{tek: 'baz'},
				{tek: 'foz'}
			]}},
			e = new Evaluator(null, context);
		return e.eval(toTree('foo.bar[1].tek')).should.become('baz');
	});
	it('should allow filters to select object properties', function() {
		var context = {foo: {baz: {bar: 'tek'}}},
			e = new Evaluator(null, context);
		return e.eval(toTree('foo["ba" + "z"].bar'))
			.should.become(context.foo.baz.bar);
	});
	it('should throw when transform does not exist', function() {
		var e = new Evaluator();
		return e.eval(toTree('"hello"|world')).should.reject;
	});
});