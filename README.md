# firebase-components

A small component experiment using jQuery & Firebase.

## HTML Includes

## HTML Templates

## Logic-less handlebars templates
- Logic-less handlebars-style template substitution


### Component Specification
Components are exposed as a presentation-layer, reusable element. They abstract away one level of complexity, typically to perform a single task. Their success requires several elements to be present:

- Structured JSON data retrieval

- Activate & fulfill a component

- Shadow DOM

### However, another equally-challenging element of this feature is typically left out of other component specifications:

- Feeding data from many documents into a structured JSON document

- Feeding user-data into a structured JSON document

- Allowing end-users to feed data into a structured JSON document

### Types of data
- Public
- Semi-Private (Available to the user & site-owner)
- Private (Available only to the site owner)

### Actions
- Input elements must be grouped somehow. Possibly into forms.
- Each input element must be bound to a key.
- "Submit buttons" must take some kind of CRUD action (new row, update row, delete row).
- Perhaps any element can take an action (Think {{action}} helper).
- Authentication may or may not be required.

### Input components
- `[data-destination]` specifies the component can push data somewhere.
- `[data-action=create|update|delete]` specifies an action for this component.
- A data payload is constructed by looping through each `input[name]` element.
- `[name]` represents the key.