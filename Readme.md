# EasyBack

## Motivation

Developing a backend for a project often involves writing repetitive code for database operations such as insert, update, create, list, and more. When dealing with multiple tables, this redundancy can quickly become a burden. EasyBack simplifies backend development by automaticly providing rest interface. It derives table definitions from your database and prepares a user-friendly interface API.

### Insert

Perform an insert operation with a simple POST request. If you provide an ID, it updates the record with that identity. If the ID is null, 0, undefined, or an empty string, EasyBack creates a new record.

```javascript
fetch('/api/v1/products', {
    method: 'POST', 
    body: JSON.stringify({ name: 'Jean', user: 123, description: 'My Jean' })
})
```

### Update

Update a field by specifying the ID of the record.

```javascript
fetch('/api/v1/products', {
    method: 'POST', 
    body: JSON.stringify({ id: 97, name: 'Red jean' })
})
```

### List of Records

Retrieve data with flexible filtering using the `where` parameter. You can specify conditions like `id,eq,97`, `name,like,ice`, or even multiple conditions like `language,in,en,tr,ua`. EasyBack also supports sorting with the `orderBy` option.

```javascript
fetch('/api/v1/products?where=name,like,jean&category,eq,45')
```

The return data format is always a JSON object with the structure `{ msg: 'not found', error: 1, data: e }` for error handling. If no records are found in the database, it returns an empty array (`[]`). On successful insert or update, it provides information like `{ affected: 1, insertedId: 132 }`.

## Recipes

### Sequental 
Here's an example of how to use EasyBack to retrieve images for a specific page using its slug:

```javascript
let pageData = await fetch(`/api/v1/pages?where=id,eq,${slug}`).then(r => r.json())
let images = []
if (!pageData.error && pageData.data.length) {
    images = await fetch(`/api/v1/images?where=page,eq,${pageData.data[0].id}`).then(r => r.json())
}
```

Simplify your backend development with EasyBack and focus on building your application's unique features instead of writing repetitive code.

### Authentication
We prepared login/auth tracking but it can be shilded with your implementation on app.

## Todo
    1) pageing 
    2) example to include custom auth
    