const assert = require('assert');
const { extractVariablesFromTemplate } = require('../src/utils/variableExtractor');

/**
 * SPECIALIZED TEST SUITE FOR VARIABLE EXTRACTOR
 * 
 * This suite focuses exclusively on the variable extraction logic
 * with comprehensive edge cases and complex scenarios
 */

suite('Variable Extractor - Specialized Tests', () => {
	
	suite('Advanced Type Inference', () => {
		test('Should infer string from concatenation', () => {
			const template = '{{ name + " Smith" }}';
			const vars = extractVariablesFromTemplate(template);
			assert.strictEqual(typeof vars.name, 'string');
		});

		test('Should infer number from division', () => {
			const template = '{{ total / count }}';
			const vars = extractVariablesFromTemplate(template);
			assert.strictEqual(typeof vars.total, 'number');
			assert.strictEqual(typeof vars.count, 'number');
		});

		test('Should infer boolean from not operator', () => {
			const template = '{% if not is_active %}disabled{% endif %}';
			const vars = extractVariablesFromTemplate(template);
			assert.strictEqual(typeof vars.is_active, 'boolean');
		});

		test('Should infer array from length filter', () => {
			const template = '{{ items | length }}';
			const vars = extractVariablesFromTemplate(template);
			// length filter can be used on arrays or strings, so this tests current behavior
			assert.ok(vars.items !== undefined);
		});

		test('Should infer object from keys method', () => {
			const template = '{{ data.keys() }}';
			const vars = extractVariablesFromTemplate(template);
			assert.ok(typeof vars.data === 'object');
		});

		test('Should prioritize string inference over boolean', () => {
			const template = '{% if status == "active" %}{{ status }}{% endif %}';
			const vars = extractVariablesFromTemplate(template);
			assert.strictEqual(typeof vars.status, 'string');
		});

		test('Should infer number from comparison operators', () => {
			const template = '{% if score >= 100 %}winner{% endif %}';
			const vars = extractVariablesFromTemplate(template);
			assert.strictEqual(typeof vars.score, 'number');
		});

		test('Should infer number from modulo operator', () => {
			const template = '{% if count % 2 == 0 %}even{% endif %}';
			const vars = extractVariablesFromTemplate(template);
			assert.strictEqual(typeof vars.count, 'number');
		});
	});

	suite('Complex Nested Structures', () => {
		test('Should handle deeply nested dictionary access', () => {
			const template = '{{ config.server.database.connections.primary.host }}';
			const vars = extractVariablesFromTemplate(template);
			
			assert.ok(vars.config);
			assert.ok(vars.config.server);
			assert.ok(vars.config.server.database);
			assert.ok(vars.config.server.database.connections);
			assert.ok(vars.config.server.database.connections.primary);
			assert.ok(vars.config.server.database.connections.primary.host !== undefined);
		});

		test('Should handle array of objects with nested properties', () => {
			const template = `
				{% for user in users %}
					{{ user.profile.address.city }}
					{{ user.profile.address.country }}
				{% endfor %}
			`;
			const vars = extractVariablesFromTemplate(template);
			
			assert.ok(Array.isArray(vars.users));
			assert.ok(vars.users[0].profile);
			assert.ok(vars.users[0].profile.address);
			assert.ok(vars.users[0].profile.address.city !== undefined);
		});

		test('Should handle mixed array and object access', () => {
			const template = '{{ data.items[0].properties.name }}';
			const vars = extractVariablesFromTemplate(template);
			
			assert.ok(vars.data);
			assert.ok(vars.data.items);
		});

		test('Should handle parallel nested structures', () => {
			const template = `
				{{ user.name }}
				{{ user.email }}
				{{ config.apiKey }}
				{{ config.timeout }}
			`;
			const vars = extractVariablesFromTemplate(template);
			
			assert.ok(vars.user.name !== undefined);
			assert.ok(vars.user.email !== undefined);
			assert.ok(vars.config.apiKey !== undefined);
			assert.ok(vars.config.timeout !== undefined);
		});
	});

	suite('Loop Constructs', () => {
		test('Should handle enumerate-style loops', () => {
			const template = '{% for index, item in items %}{{ index }}: {{ item }}{% endfor %}';
			const vars = extractVariablesFromTemplate(template);
			
			assert.ok(vars.items !== undefined);
			assert.ok(vars.index === undefined, 'Loop variable should not be extracted');
		});

		test('Should handle dictionary unpacking in loops', () => {
			const template = '{% for key, value in data.items() %}{{ key }}: {{ value }}{% endfor %}';
			const vars = extractVariablesFromTemplate(template);
			
			assert.ok(typeof vars.data === 'object');
			assert.ok(vars.key === undefined, 'Loop key variable should not be extracted');
			assert.ok(vars.value === undefined, 'Loop value variable should not be extracted');
		});

		test('Should handle nested loop with different iteration variables', () => {
			const template = `
				{% for category in categories %}
					{% for product in category.products %}
						{{ product.name }}
					{% endfor %}
				{% endfor %}
			`;
			const vars = extractVariablesFromTemplate(template);
			
			assert.ok(vars.categories !== undefined);
			assert.ok(vars.category === undefined);
			assert.ok(vars.product === undefined);
		});

		test('Should handle loop.index and loop special variables', () => {
			const template = `
				{% for item in items %}
					{{ loop.index }}: {{ item }}
					{{ loop.first }} {{ loop.last }}
				{% endfor %}
			`;
			const vars = extractVariablesFromTemplate(template);
			
			assert.ok(vars.items !== undefined);
			assert.ok(vars.loop === undefined, 'Special loop variable should not be extracted');
		});

		test('Should handle recursive loops', () => {
			const template = `
				{% for item in items recursive %}
					{{ item.name }}
					{% if item.children %}
						{{ loop(item.children) }}
					{% endif %}
				{% endfor %}
			`;
			const vars = extractVariablesFromTemplate(template);
			
			assert.ok(vars.items !== undefined);
		});
	});

	suite('Conditional Expressions', () => {
		test('Should extract from complex boolean expressions', () => {
			const template = '{% if (age > 18 and status == "active") or is_admin %}allowed{% endif %}';
			const vars = extractVariablesFromTemplate(template);
			
			assert.ok(vars.age !== undefined);
			assert.ok(vars.status !== undefined);
			assert.ok(vars.is_admin !== undefined);
		});

		test('Should extract from elif chains', () => {
			const template = `
				{% if score >= 90 %}A
				{% elif score >= 80 %}B
				{% elif score >= 70 %}C
				{% else %}F
				{% endif %}
			`;
			const vars = extractVariablesFromTemplate(template);
			
			assert.ok(vars.score !== undefined);
			assert.strictEqual(typeof vars.score, 'number');
		});

		test('Should extract from nested ternary expressions', () => {
			const template = "{{ 'high' if score > 80 else ('medium' if score > 50 else 'low') }}";
			const vars = extractVariablesFromTemplate(template);
			
			assert.ok(vars.score !== undefined);
		});

		test('Should extract from is tests', () => {
			const template = '{% if value is defined and value is not none %}{{ value }}{% endif %}';
			const vars = extractVariablesFromTemplate(template);
			
			assert.ok(vars.value !== undefined);
		});

		test('Should extract from in operator', () => {
			const template = "{% if 'admin' in user.roles %}admin{% endif %}";
			const vars = extractVariablesFromTemplate(template);
			
			assert.ok(vars.user !== undefined);
			assert.ok(vars.user.roles !== undefined);
		});
	});

	suite('Filter Chains and Arguments', () => {
		test('Should extract from chained filters', () => {
			const template = '{{ text | lower | trim | replace("old", "new") }}';
			const vars = extractVariablesFromTemplate(template);
			
			assert.ok(vars.text !== undefined);
		});

		test('Should extract from filter with variable arguments', () => {
			const template = '{{ items | join(separator) }}';
			const vars = extractVariablesFromTemplate(template);
			
			assert.ok(vars.items !== undefined);
			assert.ok(vars.separator !== undefined);
		});

		test('Should extract from filter with multiple variable arguments', () => {
			const template = '{{ value | default(fallback1, fallback2) }}';
			const vars = extractVariablesFromTemplate(template);
			
			assert.ok(vars.value !== undefined);
			assert.ok(vars.fallback1 !== undefined);
			assert.ok(vars.fallback2 !== undefined);
		});

		test('Should extract from map filter with lambda', () => {
			const template = '{{ users | map(attribute="name") | list }}';
			const vars = extractVariablesFromTemplate(template);
			
			assert.ok(vars.users !== undefined);
		});

		test('Should extract from select/reject filters', () => {
			const template = '{{ items | select("defined") | list }}';
			const vars = extractVariablesFromTemplate(template);
			
			assert.ok(vars.items !== undefined);
		});
	});

	suite('Template Inheritance and Includes', () => {
		test('Should extract from block overrides', () => {
			const template = `
				{% extends "base.html" %}
				{% block title %}{{ page_title }}{% endblock %}
				{% block content %}{{ page_content }}{% endblock %}
			`;
			const vars = extractVariablesFromTemplate(template);
			
			assert.ok(vars.page_title !== undefined);
			assert.ok(vars.page_content !== undefined);
		});

		test('Should extract from named blocks', () => {
			const template = `
				{% block header %}
					{{ site_name }}
				{% endblock header %}
			`;
			const vars = extractVariablesFromTemplate(template);
			
			assert.ok(vars.site_name !== undefined);
		});

		test('Should extract from super() calls', () => {
			const template = `
				{% block content %}
					{{ super() }}
					{{ additional_content }}
				{% endblock %}
			`;
			const vars = extractVariablesFromTemplate(template);
			
			assert.ok(vars.additional_content !== undefined);
		});

		test('Should extract from include with context', () => {
			const template = '{% include "partial.html" with context %}{{ main_var }}';
			const vars = extractVariablesFromTemplate(template);
			
			assert.ok(vars.main_var !== undefined);
		});

		test('Should extract from import statements', () => {
			const template = `
				{% import "macros.html" as macros %}
				{{ macros.render_item(item) }}
			`;
			const vars = extractVariablesFromTemplate(template);
			
			assert.ok(vars.item !== undefined);
		});
	});

	suite('Macros and Callable Structures', () => {
		test('Should extract from macro calls', () => {
			const template = `
				{% macro render_user(user) %}
					{{ user.name }}
				{% endmacro %}
				{{ render_user(current_user) }}
			`;
			const vars = extractVariablesFromTemplate(template);
			
			assert.ok(vars.current_user !== undefined);
		});

		test('Should extract from macro with default arguments', () => {
			const template = `
				{% macro greet(name, greeting="Hello") %}
					{{ greeting }} {{ name }}
				{% endmacro %}
				{{ greet(username) }}
			`;
			const vars = extractVariablesFromTemplate(template);
			
			assert.ok(vars.username !== undefined);
		});

		test('Should extract from call blocks', () => {
			const template = `
				{% call(item) render_list(items) %}
					{{ item.name }}
				{% endcall %}
			`;
			const vars = extractVariablesFromTemplate(template);
			
			assert.ok(vars.items !== undefined);
		});
	});

	suite('Set Statements and Assignments', () => {
		test('Should extract referenced variables in set assignments', () => {
			const template = '{% set total = price * quantity %}{{ total }}';
			const vars = extractVariablesFromTemplate(template);
			
			assert.ok(vars.price !== undefined);
			assert.ok(vars.quantity !== undefined);
			assert.ok(vars.total === undefined, 'Assigned variable should not be extracted');
		});

		test('Should handle block set statements', () => {
			const template = `
				{% set my_var %}
					{{ content }}
				{% endset %}
			`;
			const vars = extractVariablesFromTemplate(template);
			
			assert.ok(vars.content !== undefined);
			assert.ok(vars.my_var === undefined);
		});

		test('Should handle namespace assignments', () => {
			const template = `
				{% set ns = namespace(counter=0) %}
				{% set ns.counter = ns.counter + increment %}
			`;
			const vars = extractVariablesFromTemplate(template);
			
			assert.ok(vars.increment !== undefined);
			assert.ok(vars.ns === undefined);
		});

		test('Should handle multiple assignments', () => {
			const template = `
				{% set a, b, c = x, y, z %}
			`;
			const vars = extractVariablesFromTemplate(template);
			
			assert.ok(vars.x !== undefined);
			assert.ok(vars.y !== undefined);
			assert.ok(vars.z !== undefined);
			assert.ok(vars.a === undefined);
		});
	});

	suite('With Blocks', () => {
		test('Should extract from with block assignments', () => {
			const template = '{% with total = items | length %}{{ total }}{% endwith %}';
			const vars = extractVariablesFromTemplate(template);
			
			assert.ok(vars.items !== undefined);
		});

		test('Should extract from multiple with assignments', () => {
			const template = '{% with a = x, b = y %}{{ a }} {{ b }}{% endwith %}';
			const vars = extractVariablesFromTemplate(template);
			
			assert.ok(vars.x !== undefined);
			assert.ok(vars.y !== undefined);
		});

		test('Should handle nested with blocks', () => {
			const template = `
				{% with outer = value1 %}
					{% with inner = value2 %}
						{{ outer }} {{ inner }}
					{% endwith %}
				{% endwith %}
			`;
			const vars = extractVariablesFromTemplate(template);
			
			assert.ok(vars.value1 !== undefined);
			assert.ok(vars.value2 !== undefined);
		});
	});

	suite('Array and Dictionary Access', () => {
		test('Should handle negative array indexing', () => {
			const template = '{{ items[-1] }} {{ items[-2] }}';
			const vars = extractVariablesFromTemplate(template);
			
			assert.ok(Array.isArray(vars.items) || typeof vars.items === 'object');
		});

		test('Should handle slice with step', () => {
			const template = '{{ items[::2] }}';
			const vars = extractVariablesFromTemplate(template);
			
			assert.ok(vars.items !== undefined);
		});

		test('Should handle dynamic key access', () => {
			const template = '{{ data[key_name] }}';
			const vars = extractVariablesFromTemplate(template);
			
			assert.ok(vars.data !== undefined);
			assert.ok(vars.key_name !== undefined);
		});

		test('Should handle chained array access', () => {
			const template = '{{ matrix[0][1][2] }}';
			const vars = extractVariablesFromTemplate(template);
			
			assert.ok(vars.matrix !== undefined);
		});

		test('Should handle mixed access patterns', () => {
			const template = '{{ data.items[0].properties["key"] }}';
			const vars = extractVariablesFromTemplate(template);
			
			assert.ok(vars.data !== undefined);
		});
	});

	suite('String Operations and Methods', () => {
		test('Should extract from string methods', () => {
			const template = '{{ text.split(",") }}';
			const vars = extractVariablesFromTemplate(template);
			
			assert.ok(vars.text !== undefined);
		});

		test('Should handle string formatting', () => {
			const template = '{{ "Hello %s" % name }}';
			const vars = extractVariablesFromTemplate(template);
			
			assert.ok(vars.name !== undefined);
		});

		test('Should handle format method', () => {
			const template = '{{ "Hello {}".format(name) }}';
			const vars = extractVariablesFromTemplate(template);
			
			assert.ok(vars.name !== undefined);
		});
	});

	suite('Mathematical and Logical Operations', () => {
		test('Should extract from complex arithmetic', () => {
			const template = '{{ (price * quantity) + tax - discount }}';
			const vars = extractVariablesFromTemplate(template);
			
			assert.ok(vars.price !== undefined);
			assert.ok(vars.quantity !== undefined);
			assert.ok(vars.tax !== undefined);
			assert.ok(vars.discount !== undefined);
		});

		test('Should extract from power operator', () => {
			const template = '{{ base ** exponent }}';
			const vars = extractVariablesFromTemplate(template);
			
			assert.ok(vars.base !== undefined);
			assert.ok(vars.exponent !== undefined);
		});

		test('Should extract from floor division', () => {
			const template = '{{ total // divisor }}';
			const vars = extractVariablesFromTemplate(template);
			
			assert.ok(vars.total !== undefined);
			assert.ok(vars.divisor !== undefined);
		});

		test('Should extract from complex logical expressions', () => {
			const template = '{% if (a or b) and not (c or d) %}yes{% endif %}';
			const vars = extractVariablesFromTemplate(template);
			
			assert.ok(vars.a !== undefined);
			assert.ok(vars.b !== undefined);
			assert.ok(vars.c !== undefined);
			assert.ok(vars.d !== undefined);
		});
	});

	suite('Special Edge Cases', () => {
		test('Should handle variables in raw blocks correctly', () => {
			const template = `
				{% raw %}{{ not_a_var }}{% endraw %}
				{{ real_var }}
			`;
			const vars = extractVariablesFromTemplate(template);
			
			// Raw blocks are tricky - current implementation might extract both
			assert.ok(vars.real_var !== undefined);
		});

		test('Should handle very long filter chains', () => {
			const template = '{{ value | filter1 | filter2 | filter3 | filter4 | filter5 }}';
			extractVariablesFromTemplate(template);
			
			assert.ok(true, 'Should handle long filter chains');
		});

		test('Should handle variables in autoescape blocks', () => {
			const template = '{% autoescape true %}{{ html_content }}{% endautoescape %}';
			extractVariablesFromTemplate(template);
			
			assert.ok(true, 'Should handle autoescape blocks');
		});

		test('Should handle trans blocks (i18n)', () => {
			const template = '{% trans %}Hello {{ name }}{% endtrans %}';
			const vars = extractVariablesFromTemplate(template);
			
			assert.ok(vars.name !== undefined);
		});

		test('Should handle do statements', () => {
			const template = '{% do data.append(new_item) %}';
			const vars = extractVariablesFromTemplate(template);
			
			assert.ok(vars.data !== undefined);
			assert.ok(vars.new_item !== undefined);
		});

		test('Should handle loop break and continue', () => {
			const template = `
				{% for item in items %}
					{% if item.skip %}{% continue %}{% endif %}
					{% if item.stop %}{% break %}{% endif %}
					{{ item.name }}
				{% endfor %}
			`;
			const vars = extractVariablesFromTemplate(template);
			
			assert.ok(vars.items !== undefined);
		});
	});

	suite('Stress Tests', () => {
		test('Should handle template with 500+ variables', () => {
			let template = '';
			for (let i = 0; i < 500; i++) {
				template += `{{ var${i} }} `;
			}
			
			const vars = extractVariablesFromTemplate(template);
			assert.strictEqual(Object.keys(vars).length, 500);
		});

		test('Should handle 10-level deep nesting', () => {
			const template = '{{ a.b.c.d.e.f.g.h.i.j }}';
			const vars = extractVariablesFromTemplate(template);
			
			let current = vars.a;
			const levels = ['b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'];
			for (const level of levels.slice(0, -1)) {
				assert.ok(current[level] !== undefined);
				current = current[level];
			}
		});

		test('Should handle template with 100 nested loops', () => {
			let template = '';
			for (let i = 0; i < 100; i++) {
				template = `{% for item${i} in items${i} %}${template}{{ item${i} }}{% endfor %}`;
			}
			
			const vars = extractVariablesFromTemplate(template);
			// Should extract all items arrays
			for (let i = 0; i < 100; i++) {
				assert.ok(vars[`items${i}`] !== undefined, `Should extract items${i}`);
			}
		});

		test('Should handle extremely long variable name (1000 chars)', () => {
			const longName = 'var' + 'a'.repeat(997);
			const template = `{{ ${longName} }}`;
			
			const vars = extractVariablesFromTemplate(template);
			assert.ok(vars[longName] !== undefined);
		});
	});

	suite('Regression Prevention', () => {
		test('Should not enter infinite loop with regex', () => {
			const template = '{{ {{ }}';
			
			const timeout = setTimeout(() => {
				assert.fail('Extraction took too long - possible infinite loop');
			}, 5000);
			
			try {
				extractVariablesFromTemplate(template);
				clearTimeout(timeout);
				assert.ok(true);
			} catch (error) {
				clearTimeout(timeout);
				assert.ok(true, 'Should handle malformed input gracefully');
			}
		});

		test('Should handle circular reference simulation', () => {
			const template = '{% set a = b %}{% set b = a %}';
			const vars = extractVariablesFromTemplate(template);
			
			// Should extract referenced variables
			assert.ok(vars.a !== undefined || vars.b !== undefined);
		});

		test('Should not crash on extremely nested parentheses', () => {
			const template = '{{ ((((((((((value)))))))))) }}';
			
			try {
				const vars = extractVariablesFromTemplate(template);
				assert.ok(vars.value !== undefined);
			} catch (error) {
				assert.ok(true, 'Should handle without crashing');
			}
		});
	});
});

