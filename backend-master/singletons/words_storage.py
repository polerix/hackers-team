import os

from utils.singleton import singleton

LEXICON_DIR = "words/hackthegibson-lexicons/hackthegibson"


@singleton
class WordsStorage:
    def __init__(self):
        # Compound noun and adjective components (from hackthegibson lexicon)
        self.COMPOUND_NOUN_PREFIXES = []
        self.COMPOUND_NOUN_BASES = []
        self.COMPOUND_ADJ_PREFIXES = []
        self.COMPOUND_ADJ_BASES = []

        # Fallback legacy prefixes (used if compound lists are empty)
        self.PREFIXES = [
            "ultra", "super", "mega", "proto", "sub", "pro", "alter", "hyper", "de", "iono", "arch", "bio",
            "mono", "bi", "tri", "quadri", "penta", "hexa", "octa", "deca", "multi",
            "hemi", "holo", "pseudo", "thermo", "turbo", "hypno", "infra", "astro", "macro", "spectro", "cyber", "tele"
        ]

        # English nouns/adjectives — stored in both M and F buckets so the
        # existing command_name_generator (which randomly picks M or F) still works.
        self.MASCULINE = {
            "rare_nouns": [],
            "rare_adjectives": [],
            "nouns": [],
            "adjectives": []
        }

        self.FEMININE = {
            "rare_nouns": [],
            "rare_adjectives": [],
            "nouns": [],
            "adjectives": []
        }

        self.VERBS = []
        self.ON_OFF_VERBS = []  # list of (on_verb, off_verb) tuples

    def _read_lexicon_file(self, filename):
        """Read lines from a hackthegibson lexicon file, skipping comments and blanks."""
        path = os.path.join(LEXICON_DIR, filename)
        with open(path, "r") as f:
            return [line.strip() for line in f if line.strip() and not line.strip().startswith("#")]

    def load_nouns(self):
        lines = self._read_lexicon_file("nouns.txt")
        for noun in lines:
            noun = noun.lower()
            self.MASCULINE["nouns"].append(noun)
            self.FEMININE["nouns"].append(noun)

    def load_adjectives(self):
        lines = self._read_lexicon_file("adjectives.txt")
        for adj in lines:
            adj = adj.lower()
            self.MASCULINE["adjectives"].append(adj)
            self.FEMININE["adjectives"].append(adj)

    def load_verbs(self):
        lines = self._read_lexicon_file("verbs.txt")
        self.VERBS = [v.lower() for v in lines]

    def load_on_off_verbs(self):
        lines = self._read_lexicon_file("on-off verbs.txt")
        for line in lines:
            parts = line.split(",")
            if len(parts) == 2:
                self.ON_OFF_VERBS.append((parts[0].strip(), parts[1].strip()))

    def load_compound_nouns(self):
        lines = self._read_lexicon_file("compound nouns.txt")
        in_prefix = False
        in_base = False
        for line in lines:
            if line.lower() == "# prefix":
                in_prefix = True
                in_base = False
            elif line.lower() == "# base":
                in_prefix = False
                in_base = True
            elif in_prefix:
                self.COMPOUND_NOUN_PREFIXES.append(line.lower())
            elif in_base:
                self.COMPOUND_NOUN_BASES.append(line.lower())

    def load_compound_adjectives(self):
        lines = self._read_lexicon_file("compound adjectives.txt")
        in_prefix = False
        in_base = False
        for line in lines:
            if line.lower() == "# prefix":
                in_prefix = True
                in_base = False
            elif line.lower() == "# base":
                in_prefix = False
                in_base = True
            elif in_prefix:
                self.COMPOUND_ADJ_PREFIXES.append(line.lower())
            elif in_base:
                self.COMPOUND_ADJ_BASES.append(line.lower())

    def load(self):
        self.load_nouns()
        self.load_adjectives()
        self.load_verbs()
        self.load_on_off_verbs()
        self.load_compound_nouns()
        self.load_compound_adjectives()