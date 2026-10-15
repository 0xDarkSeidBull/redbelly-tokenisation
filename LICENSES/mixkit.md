# Sound effects licence proof (Mixkit)

5 sound effects in the mix come from Mixkit, under the Mixkit Sound Effects Free License: https://mixkit.co/license/#sfxFree

The licence text, as published on that page (read 15 Oct 2026):

> Items under the Mixkit Sound Effects Free License can be used in your commercial and non-commercial projects for free.
>
> You are licensed to use the Item to create an End Product that incorporates the Item as well as other things, so that it is larger in scope and different in nature than the Item. You're permitted to download, copy, modify, distribute and publicly perform the Sound Effect Items on any web or social media platform, in podcasts and in video games, as well as in films and presentations distributed on CDs, DVDs, via TV or radio broadcast or internet based video on demand services.
>
> You can't redistribute the Item on its own, as stock, in a tool or template, or with source files. You're also not allowed to claim them as your own or register them on any rights management service.

Because the licence does not allow the files to be shared on their own, they are not stored in this repository. `scripts/fetch_sfx.py` downloads them into `assets/sfx/` (git-ignored) and checks each SHA-256 before the mix is built.

| Used as | Mixkit item | Source file | SHA-256 |
|---|---|---|---|
| Soft sweep at each scene change | Fast small sweep transition (166) | https://assets.mixkit.co/active_storage/sfx/166/166.wav | `ca5a0206a7e6b12893a5727cb98a9d43ab02893153465eb21d43fb7b9e6616c3` |
| Click on every check, toggle and lock | Modern click box check (1120) | https://assets.mixkit.co/active_storage/sfx/1120/1120.wav | `1a7789372a284b2dc2f106da1375b4a3aa4ef3e794c5cbc1b404a1096a6aa467` |
| Tone when the last token lands, and as the voice ends | Correct answer tone (2870) | https://assets.mixkit.co/active_storage/sfx/2870/2870.wav | `084b78463e30dae4aac5edbf9e9c93cdee5ece4a4a688352e6a2b6686f9b1f4a` |
| Whoosh on the opening, the slides and the toggles | Arrow whoosh (1491) | https://assets.mixkit.co/active_storage/sfx/1491/1491.wav | `c9aa08de97e5a1235f9b2b4eb7a1096f2fe09586995859e46aa83e9066badca2` |
| Coin as the fund takes form | Arcade game jump coin (216) | https://assets.mixkit.co/active_storage/sfx/216/216.wav | `b4aaa99e6076c75e7785bebd5431a5399043db47090233cae80cf76acf0114ca` |

Where each sound plays: the event timed sounds are placed by `scripts/build_audio.py`, and the extra cues are listed in `content/sfx_cues.json`. The low blip on each rejected transfer and the error buzz are made from code in `scripts/build_audio.py`.
