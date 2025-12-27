# PythonCodingConventions.md

## Purpose

This document defines the coding conventions and behavioral guidelines that AI agents must follow when generating or modifying Python code in this repository. The goal is to ensure consistency, readability, maintainability, and alignment with Python best practices.

---

## Scope

* Applies to **all Python files** (`**/*.py`)
* Must be followed by any automated agent, code generator, or reviewer

---

## Core Principles

* Prioritize **readability and clarity** over cleverness
* Write code that is easy for humans to understand, review, and maintain
* Prefer explicit, idiomatic Python over implicit or obscure constructs
* Handle edge cases deliberately and document assumptions

---

## Python Coding Guidelines

### Functions

* Use **descriptive and intention-revealing names**
* Always include **type hints** using the `typing` module where appropriate
* Keep functions small and focused on a single responsibility
* Break down complex logic into smaller helper functions

```python
from typing import List, Dict

def process_items(items: List[str]) -> Dict[str, int]:
    """
    Process a list of items and return their counts.
    """
    ...
```

---

### Docstrings

* Follow **PEP 257** conventions
* Place docstrings immediately after `def` or `class`
* Clearly describe:

  * Purpose of the function or class
  * Parameters and their meaning
  * Return values
  * Exceptions raised (if any)

---

### Comments

* Write comments to explain **why** a design or decision exists
* Avoid redundant comments that restate obvious code behavior
* Mention the purpose of external libraries or dependencies when used

---

## Type Annotations

* Use standard `typing` constructs such as:

  * `List[T]`, `Dict[K, V]`, `Optional[T]`, `Tuple[...]`
* Prefer precise types over `Any`
* Ensure annotations remain accurate as code evolves

---

## Error Handling

* Explicitly handle expected error cases
* Use clear and specific exceptions
* Document exceptional behavior in docstrings
* Avoid silent failures

```python
if not items:
    raise ValueError("items must not be empty")
```

---

## Code Style and Formatting

* Strictly follow **PEP 8**
* Indentation: **4 spaces**
* Maximum line length: **79 characters**
* Use blank lines to separate:

  * Top-level functions
  * Classes
  * Logical code blocks

---

## Algorithmic Code

* Include a short explanation of the chosen approach
* Clarify time and space complexity if relevant
* Prefer clarity over micro-optimizations unless performance is critical

---

## Edge Cases

Agents must explicitly consider and document behavior for:

* Empty inputs
* Invalid data types
* Boundary values
* Large datasets

Comments should describe the expected behavior in these scenarios.

---

## Testing Requirements

* Write **unit tests** for critical paths
* Include tests for edge cases and failure modes
* Add docstrings to test functions explaining what is being validated

```python
def test_empty_input_raises_error():
    """
    Ensure ValueError is raised when input is empty.
    """
    ...
```

---

## Example Reference

```python
import math

def calculate_area(radius: float) -> float:
    """
    Calculate the area of a circle given the radius.

    Parameters:
        radius (float): The radius of the circle.

    Returns:
        float: The area of the circle, calculated as π * radius^2.
    """
    return math.pi * radius ** 2
```

---

## Enforcement

* Any generated code that violates this document should be revised
* If a guideline cannot be followed, the agent must clearly explain why
* Consistency across the codebase is mandatory
