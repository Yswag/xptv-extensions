const { getConfig, getCards, getTracks, getPlayinfo, search } = require('../js/bttwo')

;(async () => {
    let ext = {}
    // let config = await getConfig()
    // console.log(JSON.stringify(config, null, 2))
    ext = {
        url: 'https://www.bttwo.me/movie/133507.html',
    }
    // let tracks = await getTracks(ext)
    // console.log(JSON.stringify(tracks, null, 2))
    ext = {
        text: '我',
    }
    let res = await search(ext)
    console.log(res)
})()
