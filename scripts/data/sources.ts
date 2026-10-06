/** Every upstream dataset the pipeline touches, with its licence duties. */
export interface Source {
  id: string
  name: string
  url: string
  homepage: string
  file: string
  licence: { name: string; url: string; notes?: string }
  attribution: string
}

export const SOURCES: Source[] = [
  {
    id: 'jmdict',
    name: 'JMdict (English, with examples)',
    url: 'https://www.edrdg.org/pub/Nihongo/JMdict_e_examp.gz',
    homepage: 'https://www.edrdg.org/jmdict/j_jmdict.html',
    file: 'JMdict_e_examp.gz',
    licence: {
      name: 'CC BY-SA 4.0 (EDRDG licence)',
      url: 'https://www.edrdg.org/edrdg/licence.html',
      notes: 'Requires acknowledgement on a dedicated screen and a procedure for regular updates.',
    },
    attribution:
      'This app uses the JMdict dictionary file. This file is the property of the Electronic Dictionary Research and Development Group, and is used in conformance with the Group\u2019s licence.',
  },
  {
    id: 'kanjidic2',
    name: 'KANJIDIC2',
    url: 'https://www.edrdg.org/pub/Nihongo/kanjidic2.xml.gz',
    homepage: 'https://www.edrdg.org/wiki/index.php/KANJIDIC_Project',
    file: 'kanjidic2.xml.gz',
    licence: {
      name: 'CC BY-SA 4.0 (EDRDG licence)',
      url: 'https://www.edrdg.org/edrdg/licence.html',
      notes: 'SKIP codes inside the file are CC BY-NC-SA and are removed at build time.',
    },
    attribution:
      'This app uses the KANJIDIC2 dictionary file. This file is the property of the Electronic Dictionary Research and Development Group, and is used in conformance with the Group\u2019s licence.',
  },
  {
    id: 'kradfile',
    name: 'KRADFILE / RADKFILE',
    url: 'https://www.edrdg.org/pub/Nihongo/kradzip.zip',
    homepage: 'https://www.edrdg.org/krad/kradinf.html',
    file: 'kradzip.zip',
    licence: {
      name: 'CC BY-SA 4.0 (EDRDG licence)',
      url: 'https://www.edrdg.org/edrdg/licence.html',
    },
    attribution:
      'Kanji component data comes from the KRADFILE/RADKFILE files, property of the Electronic Dictionary Research and Development Group, used in conformance with the Group\u2019s licence.',
  },
  {
    id: 'jlpt-vocab-n5',
    name: 'JLPT vocabulary list N5 (Jonathan Waller, via yomitan-jlpt-vocab)',
    url: 'https://raw.githubusercontent.com/stephenmk/yomitan-jlpt-vocab/main/original_data/n5.csv',
    homepage: 'https://github.com/stephenmk/yomitan-jlpt-vocab',
    file: 'jlpt-vocab-n5.csv',
    licence: {
      name: 'CC BY (lists) / CC BY-SA 4.0 (repository)',
      url: 'https://creativecommons.org/licenses/by/4.0/',
    },
    attribution:
      'JLPT vocabulary levels are unofficial. They come from Jonathan Waller\u2019s JLPT Resources lists (CC BY), aligned to JMdict entries by stephenmk/yomitan-jlpt-vocab.',
  },
  {
    id: 'jlpt-vocab-n4',
    name: 'JLPT vocabulary list N4 (Jonathan Waller, via yomitan-jlpt-vocab)',
    url: 'https://raw.githubusercontent.com/stephenmk/yomitan-jlpt-vocab/main/original_data/n4.csv',
    homepage: 'https://github.com/stephenmk/yomitan-jlpt-vocab',
    file: 'jlpt-vocab-n4.csv',
    licence: {
      name: 'CC BY (lists) / CC BY-SA 4.0 (repository)',
      url: 'https://creativecommons.org/licenses/by/4.0/',
    },
    attribution: 'See jlpt-vocab-n5.',
  },
  {
    id: 'jlpt-vocab-n3',
    name: 'JLPT vocabulary list N3 (Jonathan Waller, via yomitan-jlpt-vocab)',
    url: 'https://raw.githubusercontent.com/stephenmk/yomitan-jlpt-vocab/main/original_data/n3.csv',
    homepage: 'https://github.com/stephenmk/yomitan-jlpt-vocab',
    file: 'jlpt-vocab-n3.csv',
    licence: {
      name: 'CC BY (lists) / CC BY-SA 4.0 (repository)',
      url: 'https://creativecommons.org/licenses/by/4.0/',
    },
    attribution: 'See jlpt-vocab-n5.',
  },
  {
    id: 'jlpt-vocab-n2',
    name: 'JLPT vocabulary list N2 (Jonathan Waller, via yomitan-jlpt-vocab)',
    url: 'https://raw.githubusercontent.com/stephenmk/yomitan-jlpt-vocab/main/original_data/n2.csv',
    homepage: 'https://github.com/stephenmk/yomitan-jlpt-vocab',
    file: 'jlpt-vocab-n2.csv',
    licence: {
      name: 'CC BY (lists) / CC BY-SA 4.0 (repository)',
      url: 'https://creativecommons.org/licenses/by/4.0/',
    },
    attribution: 'See jlpt-vocab-n5.',
  },
  {
    id: 'jlpt-vocab-n1',
    name: 'JLPT vocabulary list N1 (Jonathan Waller, via yomitan-jlpt-vocab)',
    url: 'https://raw.githubusercontent.com/stephenmk/yomitan-jlpt-vocab/main/original_data/n1.csv',
    homepage: 'https://github.com/stephenmk/yomitan-jlpt-vocab',
    file: 'jlpt-vocab-n1.csv',
    licence: {
      name: 'CC BY (lists) / CC BY-SA 4.0 (repository)',
      url: 'https://creativecommons.org/licenses/by/4.0/',
    },
    attribution: 'See jlpt-vocab-n5.',
  },
  {
    id: 'jlpt-kanji',
    name: 'JLPT kanji levels (Jonathan Waller, via davidluzgouveia/kanji-data)',
    url: 'https://raw.githubusercontent.com/davidluzgouveia/kanji-data/master/kanji.json',
    homepage: 'https://github.com/davidluzgouveia/kanji-data',
    file: 'kanji-data.json',
    licence: {
      name: 'MIT (repository); JLPT data CC BY (Jonathan Waller)',
      url: 'https://github.com/davidluzgouveia/kanji-data/blob/master/LICENSE',
      notes:
        'Only the jlpt_new field is read. All WaniKani-derived fields are discarded at ingest.',
    },
    attribution:
      'JLPT kanji levels are unofficial. They come from Jonathan Waller\u2019s JLPT Resources lists (CC BY), as collected by davidluzgouveia/kanji-data.',
  },
  {
    id: 'kanjivg',
    name: 'KanjiVG',
    url: 'https://github.com/KanjiVG/kanjivg/releases/download/r20260714/kanjivg-20260714-all.zip',
    homepage: 'https://kanjivg.tagaini.net/',
    file: 'kanjivg.zip',
    licence: { name: 'CC BY-SA 3.0', url: 'https://creativecommons.org/licenses/by-sa/3.0/' },
    attribution:
      'Stroke order and component data come from KanjiVG, copyright Ulrich Apel, used under the Creative Commons Attribution-ShareAlike 3.0 licence (https://kanjivg.tagaini.net).',
  },
  {
    id: 'tatoeba-jpn-sentences',
    name: 'Tatoeba Japanese sentences (contributor index)',
    url: 'https://downloads.tatoeba.org/exports/per_language/jpn/jpn_sentences_detailed.tsv.bz2',
    homepage: 'https://tatoeba.org/',
    file: 'jpn_sentences_detailed.tsv.bz2',
    licence: { name: 'CC BY 2.0 FR', url: 'https://creativecommons.org/licenses/by/2.0/fr/' },
    attribution:
      'Example sentences come from the Tatoeba Project (https://tatoeba.org), licensed CC BY 2.0 FR. Each sentence credits its contributor and links to its Tatoeba page.',
  },
  {
    id: 'tatoeba-jpn-audio',
    name: 'Tatoeba Japanese audio index',
    url: 'https://downloads.tatoeba.org/exports/per_language/jpn/jpn_sentences_with_audio.tsv.bz2',
    homepage: 'https://tatoeba.org/',
    file: 'jpn_sentences_with_audio.tsv.bz2',
    licence: {
      name: 'Per recording (CC BY 4.0 or CC BY-NC 4.0 only)',
      url: 'https://tatoeba.org/en/audio/index',
      notes:
        'Recordings without a licence are never used. Each shipped clip credits its speaker and licence.',
    },
    attribution:
      'Sentence recordings come from Tatoeba contributors; each clip names its speaker and licence on the Sources screen.',
  },
]
