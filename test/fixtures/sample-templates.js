/**
 * Sample Jinja Templates for Testing
 * 
 * These templates cover various use cases and complexity levels
 */

module.exports = {
	// Basic templates
	simple: {
		template: 'Hello {{ name }}!',
		expectedVars: ['name'],
		description: 'Simple variable substitution'
	},

	greeting: {
		template: 'Hello {{ user.name }}, you have {{ message_count }} new messages.',
		expectedVars: ['user', 'message_count'],
		description: 'Mixed variable types with nested objects'
	},

	// Loop templates
	simpleLoop: {
		template: '{% for item in items %}{{ item }}{% endfor %}',
		expectedVars: ['items'],
		description: 'Simple loop iteration'
	},

	objectLoop: {
		template: '{% for user in users %}\nName: {{ user.name }}\nEmail: {{ user.email }}\n{% endfor %}',
		expectedVars: ['users'],
		description: 'Loop with object properties'
	},

	nestedLoop: {
		template: '{% for category in categories %}\n<h2>{{ category.name }}</h2>\n{% for product in category.products %}\n<p>{{ product.name }}: ${{ product.price }}</p>\n{% endfor %}\n{% endfor %}',
		expectedVars: ['categories'],
		description: 'Nested loop structures'
	},

	// Conditional templates
	simpleCondition: {
		template: '{% if is_admin %}Admin Panel{% endif %}',
		expectedVars: ['is_admin'],
		description: 'Simple conditional'
	},

	complexCondition: {
		template: '{% if age >= 18 and status == "active" %}\nWelcome!\n{% elif age >= 13 %}\nTeen account\n{% else %}\nParent required\n{% endif %}',
		expectedVars: ['age', 'status'],
		description: 'Complex conditional with multiple branches'
	},

	// Filters
	filterChain: {
		template: '{{ text | lower | trim | replace("old", "new") }}',
		expectedVars: ['text'],
		description: 'Chained filters'
	},

	filterWithVars: {
		template: '{{ value | default(fallback) }}',
		expectedVars: ['value', 'fallback'],
		description: 'Filter with variable arguments'
	},

	// Template inheritance
	templateExtends: {
		template: '{% extends "base.html" %}\n{% block title %}{{ page_title }}{% endblock %}\n{% block content %}\n<h1>{{ heading }}</h1>\n<p>{{ content }}</p>\n{% endblock %}',
		expectedVars: ['page_title', 'heading', 'content'],
		description: 'Template inheritance with blocks'
	},

	// Macros
	macroDefinition: {
		template: '{% macro render_user(user) %}\n<div class="user">\n<h3>{{ user.name }}</h3>\n<p>{{ user.email }}</p>\n</div>\n{% endmacro %}\n{% for user in users %}\n{{ render_user(user) }}\n{% endfor %}',
		expectedVars: ['users'],
		description: 'Macro definition and usage'
	},

	// Complex real-world examples
	emailTemplate: {
		template: '<!DOCTYPE html>\n<html>\n<head>\n<title>{{ email_subject }}</title>\n</head>\n<body>\n<h1>Hello {{ recipient.name }}!</h1>\n{% if notification_type == "welcome" %}\n<p>Welcome to {{ site_name }}!</p>\n{% elif notification_type == "alert" %}\n<p>Alert: {{ alert_message }}</p>\n{% endif %}\n<ul>\n{% for item in items %}\n<li>{{ item.title }} - {{ item.date | dateformat }}</li>\n{% endfor %}\n</ul>\n<p>Best regards,<br>{{ sender.name }}</p>\n</body>\n</html>',
		expectedVars: ['email_subject', 'recipient', 'notification_type', 'site_name', 'alert_message', 'items', 'sender'],
		description: 'Email template with multiple features'
	},

	configFile: {
		template: '# Configuration File\nserver:\n  host: {{ config.server.host }}\n  port: {{ config.server.port }}\n  ssl: {{ config.server.ssl }}\ndatabase:\n  engine: {{ config.database.engine }}\n  name: {{ config.database.name }}\n{% if config.database.credentials %}\n  credentials:\n    username: {{ config.database.credentials.username }}\n    password: {{ config.database.credentials.password }}\n{% endif %}\nfeatures:\n{% for feature in config.features %}\n  - {{ feature.name }}: {{ feature.enabled }}\n{% endfor %}',
		expectedVars: ['config'],
		description: 'Configuration file generation'
	},

	reportTemplate: {
		template: '# {{ report.title }}\nGenerated: {{ report.date }}\n## Summary\nTotal Records: {{ stats.total }}\nSuccess Rate: {{ (stats.success / stats.total * 100) | round(2) }}%\n## Details\n{% for section in report.sections %}\n### {{ section.name }}\n{{ section.content }}\n{% if section.data %}\n| Metric | Value |\n|--------|-------|\n{% for key, value in section.data.items() %}\n| {{ key }} | {{ value }} |\n{% endfor %}\n{% endif %}\n{% endfor %}\n## Recommendations\n{% for rec in recommendations %}\n{{ loop.index }}. {{ rec.title }}\n   {{ rec.description }}\n{% endfor %}',
		expectedVars: ['report', 'stats', 'recommendations'],
		description: 'Report generation with tables and calculations'
	},

	ansiblePlaybook: {
		template: '---\n- name: {{ playbook.name }}\n  hosts: {{ playbook.hosts }}\n  become: {{ playbook.become | default(true) }}\n  vars:\n    app_name: {{ app.name }}\n    app_version: {{ app.version }}\n    install_path: {{ app.path }}\n  tasks:\n{% for task in tasks %}\n    - name: {{ task.name }}\n      {{ task.module }}:\n{% for key, value in task.params.items() %}\n        {{ key }}: {{ value }}\n{% endfor %}\n{% if task.when %}\n      when: {{ task.when }}\n{% endif %}\n{% endfor %}',
		expectedVars: ['playbook', 'app', 'tasks'],
		description: 'Ansible playbook template'
	},

	// Edge cases
	edgeCaseEmpty: {
		template: '',
		expectedVars: [],
		description: 'Empty template'
	},

	edgeCasePlainText: {
		template: 'This is just plain text with no variables.',
		expectedVars: [],
		description: 'Plain text without Jinja syntax'
	},

	edgeCaseComments: {
		template: '{# This is a comment with {{ fake_var }} #}\n{{ real_var }}\n{# Another comment #}',
		expectedVars: ['real_var', 'fake_var'],
		description: 'Template with comments (note: extractor may include vars in comments)'
	},

	edgeCaseWhitespace: {
		template: '{{- variable -}}',
		expectedVars: ['variable'],
		description: 'Whitespace control'
	},

	edgeCaseRaw: {
		template: '{% raw %}{{ not_parsed }}{% endraw %}{{ parsed }}',
		expectedVars: ['parsed', 'not_parsed'],
		description: 'Raw blocks (note: current implementation may parse both)'
	},

	// Advanced features
	setStatements: {
		template: '{% set total = price * quantity %}\n{% set discount_price = total * (1 - discount_rate) %}\nFinal: {{ discount_price }}',
		expectedVars: ['price', 'quantity', 'discount_rate'],
		description: 'Set statements with calculations'
	},

	withBlocks: {
		template: '{% with total = items | length %}\nTotal items: {{ total }}\n{% endwith %}',
		expectedVars: ['items'],
		description: 'With blocks for scoped variables'
	},

	ternaryOperator: {
		template: "{{ 'Active' if is_active else 'Inactive' }}",
		expectedVars: ['is_active'],
		description: 'Ternary operator'
	},

	arrayAccess: {
		template: 'First: {{ items[0] }}\nLast: {{ items[-1] }}\nSlice: {{ items[1:5] }}',
		expectedVars: ['items'],
		description: 'Array indexing and slicing'
	},

	dictionaryAccess: {
		template: '{{ data["key"] }} {{ data.attribute }}',
		expectedVars: ['data'],
		description: 'Dictionary access patterns'
	},

	// Mermaid diagrams
	mermaidDiagram: {
		template: '# System Architecture\n```mermaid\ngraph TD\n    A[{{ components.frontend.name }}] -->|API| B[{{ components.backend.name }}]\n    B -->|Query| C[{{ components.database.name }}]\n```',
		expectedVars: ['components'],
		description: 'Mermaid diagram with variables'
	},

	// Markdown
	markdownDocument: {
		template: '# {{ document.title }}\n**Author:** {{ document.author }}\n**Date:** {{ document.date }}\n## Introduction\n{{ document.introduction }}\n## Sections\n{% for section in document.sections %}\n### {{ section.title }}\n{{ section.content }}\n{% if section.code %}\n```{{ section.code.language }}\n{{ section.code.content }}\n```\n{% endif %}\n{% endfor %}\n## Conclusion\n{{ document.conclusion }}',
		expectedVars: ['document'],
		description: 'Markdown document with code blocks'
	}
};
