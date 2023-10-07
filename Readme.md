
##Motivation
    For one table, you need to write insert, update, create, list, cqrs objects, definitions, access classes and many more. let say you've started project with 20 tables, 20 * 5 approximately you need to repeat your code with small variations.

    EasyBack provides backend without code. Derives table definition from DB, prepares interface.


    Insert
        POST request if you provide id, it updates identity, if id is null, 0, undefined or '', creates
        ```
        fetch('/api/v1/products', {
            method:'Post', 
            body:JSON.stringify({name:'Jean', user:123, description:'My Jean'})
            })
        ```
    Update
        update field with id
        ```
        fetch('/api/v1/products', {
            method:'Post', 
            body:JSON.stringify({id:97, name:'Red jean'})
            })
        ```
    List
        Provide where param like `id,eq,97` or `name,like,ice` or `language,in,en,tr,ua`
        Supports orderBy
        ```
            fetch('/api/v1/products?where=name,like,jean&category,eq,45')
        ```

    Return data is always json object with {msg, error, data} for error check for error, if notting found on db it returns empty [] list, on insert or update, {affected:1, insertedId:132}

        `{msg:'not found', error:1, data:e}`
        or
        `{msg:'success', error:0, data}`

##Recepies:
    Page images from slug
        let pageData = await fetch(`/api/v1/pages?where=id,eq,${slug}`).then(r=>r.json())
        let images = []
        if(!pageData.error && pageData.data.length ){
            Images =  await fetch(`/api/v1/images?where=page,eq,${pageData.data[0].id}`).then(r=>r.json())
        }
