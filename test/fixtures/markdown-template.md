# {{ project.name }}

{{ project.description }}

## Features

{% for feature in project.features %}
### {{ feature.name }}

{{ feature.description }}

{% if feature.code_example %}
```{{ feature.language }}
{{ feature.code_example }}
```
{% endif %}

{% endfor %}

## Installation

```bash
{{ project.install_command }}
```

## Usage

{{ project.usage }}

## Configuration

| Option | Description | Default |
|--------|-------------|---------|
{% for option in project.config_options %}
| `{{ option.name }}` | {{ option.description }} | `{{ option.default }}` |
{% endfor %}

## API Reference

{% for endpoint in project.api %}
### `{{ endpoint.method }} {{ endpoint.path }}`

{{ endpoint.description }}

**Parameters:**
{% for param in endpoint.parameters %}
- `{{ param.name }}` ({{ param.type }}): {{ param.description }}
{% endfor %}

**Response:**
```json
{{ endpoint.example_response }}
```

{% endfor %}

## Contributors

{% for contributor in project.contributors %}
- [{{ contributor.name }}]({{ contributor.github }}) - {{ contributor.role }}
{% endfor %}

## License

{{ project.license }}

---

Version: {{ project.version }}  
Last Updated: {{ project.last_updated }}

