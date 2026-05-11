export const parseVerseNumber = verseNumber => {
    const [part1, part2] = verseNumber.split(':')
    const chapter = Number(part1)
    if (isNaN(chapter) || chapter <= 0) {
        return '章节号无效'
    }

    if (!part2.includes('-')) {
        const verse = Number(part2)
        if (isNaN(verse) || verse <= 0) {
            return '经节号无效'
        }

        return [chapter, verse, verse]
    }

    const [part21, part22] = part2.split('-')
    const startVerse = Number(part21)
    if (isNaN(startVerse) || startVerse <= 0) {
        return '起始经节号无效'
    }
    const endVerse = Number(part22)
    if (isNaN(endVerse) || endVerse <= 0) {
        return '结束经节号无效'
    }

    if (endVerse < startVerse) {
        return [chapter, endVerse, startVerse]
    } else {
        return [chapter, startVerse, endVerse]
    }
}
