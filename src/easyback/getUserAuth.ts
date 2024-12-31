
type tokenUsers = { [token: string]: string }
const knownTokens: tokenUsers = {}


export async function getUserAuth(token: string) {
    if( token in knownTokens )
        return knownTokens[token]
    let user = await fetch(`https://derskaynagi.erkintek.workers.dev/api/checkLogin`, {
        method: 'POST', body: JSON.stringify({ token })
    }).then((r) => r.json())
    knownTokens[token] = user.userid
    if (!user || !user?.userid)
        return null
    return user
}