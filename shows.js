// EDIT THIS FILE to add or change shows. Each show gets its own page: show.html?show=<id>
// Seasons are the folders (S1, S2, Shorts, Specials...). Each episode is { title, date }.
// Optional on an episode: url: "https://..." (makes the row clickable) and thumb: "image url".
// Optional on a show: poster: "image url" (or set the poster on its tile in config.js).
const SHOWS = {
  "helluva-boss": {
    "title": "Helluva Boss",
    "description": "Blitzo and his crew run a startup in Hell that takes contracts to kill people on Earth.",
    "seasons": {
      "S1": [
        {
          "title": "Murder Family",
          "date": "Oct 31, 2020"
        },
        {
          "title": "Loo Loo Land",
          "date": "Dec 9, 2020"
        },
        {
          "title": "Spring Broken",
          "date": "Jan 31, 2021"
        },
        {
          "title": "C.H.E.R.U.B",
          "date": "Mar 14, 2021"
        },
        {
          "title": "The Harvest Moon Festival",
          "date": "Apr 30, 2021"
        },
        {
          "title": "Truth Seekers",
          "date": "Aug 21, 2021"
        },
        {
          "title": "Ozzie's",
          "date": "Oct 31, 2021"
        },
        {
          "title": "Queen Bee",
          "date": "Jun 24, 2023"
        }
      ],
      "S2": [
        {
          "title": "The Circus",
          "date": "Jul 30, 2022"
        },
        {
          "title": "Seeing Stars",
          "date": "Oct 19, 2022"
        },
        {
          "title": "Exes and Oohs",
          "date": "Mar 11, 2023"
        },
        {
          "title": "Western Energy",
          "date": "May 20, 2023"
        },
        {
          "title": "Unhappy Campers",
          "date": "Jul 8, 2023"
        },
        {
          "title": "Oops",
          "date": "Sep 9, 2023"
        },
        {
          "title": "Mammon's Magnificent Musical Mid-Season Special (ft Fizzarolli)",
          "date": "Oct 29, 2023"
        },
        {
          "title": "The Full Moon",
          "date": "May 31, 2024"
        },
        {
          "title": "Apology Tour",
          "date": "Jun 22, 2024"
        },
        {
          "title": "Ghostf**ckers",
          "date": "Oct 31, 2024"
        },
        {
          "title": "Mastermind",
          "date": "Nov 29, 2024"
        },
        {
          "title": "Sinsmas",
          "date": "Dec 21, 2024"
        }
      ],
      "S3": [
        {
          "title": "TBA",
          "date": "Oct 14, 2026"
        },
        {
          "title": "TBA",
          "date": "Oct 14, 2026"
        },
        {
          "title": "TBA",
          "date": "Oct 14, 2026"
        },
        {
          "title": "TBA",
          "date": "Oct 21, 2026"
        },
        {
          "title": "TBA",
          "date": "Oct 21, 2026"
        },
        {
          "title": "TBA",
          "date": "Oct 28, 2026"
        },
        {
          "title": "TBA",
          "date": "Oct 28, 2026"
        }
      ],
      "Shorts": [
        {
          "title": "Hell's Belles",
          "date": "Apr 26, 2024"
        },
        {
          "title": "Mission: Antarctica",
          "date": "Jul 31, 2024"
        },
        {
          "title": "Mission: Weeaboo-Boo",
          "date": "Aug 31, 2024"
        },
        {
          "title": "Mission: Chupacabras",
          "date": "Sep 29, 2024"
        },
        {
          "title": "Mission: Orphan Time",
          "date": "Jun 28, 2025"
        },
        {
          "title": "Mission: Bad Drivezo",
          "date": "Aug 2, 2025"
        },
        {
          "title": "Mission: Whacked Off",
          "date": "Sep 6, 2025"
        },
        {
          "title": "Mission: Big Boss",
          "date": "Feb 7, 2026"
        },
        {
          "title": "Mission: Bigfoot",
          "date": "Mar 7, 2026"
        },
        {
          "title": "Mission: It's Chaz Funeral",
          "date": "Apr 1, 2026"
        },
        {
          "title": "Barbie's Bad Day",
          "date": "Apr 25, 2026"
        },
        {
          "title": "IMP Training Video",
          "date": "Jun 13, 2026"
        },
        {
          "title": "Mission: Book Report",
          "date": "Jul 11, 2026"
        }
      ],
      "Specials": [
        {
          "title": "Pilot",
          "date": "Nov 25, 2019"
        },
        {
          "title": "Mission: Zero",
          "date": "Sep 10, 2025"
        }
      ]
    }
  },
  "hazbin-hotel": {
    "title": "Hazbin Hotel",
    "description": "Charlie, the Princess of Hell, opens a hotel to rehabilitate demons and send them to Heaven.",
    "seasons": {
      "S1": [
        {
          "title": "Overture",
          "date": "Jan 19, 2024"
        },
        {
          "title": "Radio Killed the Video Star",
          "date": "Jan 19, 2024"
        },
        {
          "title": "Scrambled Eggs",
          "date": "Jan 19, 2024"
        },
        {
          "title": "Masquerade",
          "date": "Jan 19, 2024"
        },
        {
          "title": "Dad Beat Dad",
          "date": "Jan 26, 2024"
        },
        {
          "title": "Welcome to Heaven",
          "date": "Jan 26, 2024"
        },
        {
          "title": "Hello Rosie!",
          "date": "Feb 2, 2024"
        },
        {
          "title": "The Show Must Go On",
          "date": "Feb 2, 2024"
        }
      ],
      "S2": [
        {
          "title": "New Pentious",
          "date": "Oct 29, 2025"
        },
        {
          "title": "Storyteller",
          "date": "Oct 29, 2025"
        },
        {
          "title": "Behind Closed Doors",
          "date": "Nov 5, 2025"
        },
        {
          "title": "It's A Deal",
          "date": "Nov 5, 2025"
        },
        {
          "title": "Silenced",
          "date": "Nov 12, 2025"
        },
        {
          "title": "Scream Rain",
          "date": "Nov 12, 2025"
        },
        {
          "title": "Weapon of Mass Distraction",
          "date": "Nov 19, 2025"
        },
        {
          "title": "Curtain Call",
          "date": "Nov 19, 2025"
        }
      ],
      "S3": [],
      "Specials": [
        {
          "title": "That's Entertainment (Pilot)",
          "date": "Oct 28, 2019"
        },
        {
          "title": "Hazbin Hotel: Live on Broadway",
          "date": "Nov 17, 2025"
        }
      ]
    }
  }
};
