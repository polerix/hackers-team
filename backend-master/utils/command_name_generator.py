import random

from singletons.words_storage import WordsStorage


class CommandNameGenerator:
    def __init__(self, words_storage=None):
        if words_storage is None:
            words_storage = WordsStorage()
        self.words_storage = words_storage
        self.used_nouns = []
        self.used_adjectives = []
        self.used_verbs = []

    def random_noun(self, masculine=None):
        if masculine is None:
            masculine = random.getrandbits(1) == 1
        if masculine:
            nouns = random.choice([self.words_storage.MASCULINE["nouns"] * 4, self.words_storage.MASCULINE["rare_nouns"]]) if self.words_storage.MASCULINE["rare_nouns"] else self.words_storage.MASCULINE["nouns"]
        else:
            nouns = random.choice([self.words_storage.FEMININE["nouns"] * 4, self.words_storage.FEMININE["rare_nouns"]]) if self.words_storage.FEMININE["rare_nouns"] else self.words_storage.FEMININE["nouns"]
        return random.choice(nouns).lower()

    def random_adjective(self, masculine=None):
        if masculine is None:
            masculine = random.getrandbits(1) == 1
        if masculine:
            adjectives = random.choice([self.words_storage.MASCULINE["adjectives"] * 4, self.words_storage.MASCULINE["rare_adjectives"]]) if self.words_storage.MASCULINE["rare_adjectives"] else self.words_storage.MASCULINE["adjectives"]
        else:
            adjectives = random.choice([self.words_storage.FEMININE["adjectives"] * 4, self.words_storage.FEMININE["rare_adjectives"]]) if self.words_storage.FEMININE["rare_adjectives"] else self.words_storage.FEMININE["adjectives"]
        return random.choice(adjectives).lower()

    def generate_compound_noun(self):
        # Use hackthegibson compound noun prefixes+bases if available
        if self.words_storage.COMPOUND_NOUN_PREFIXES and self.words_storage.COMPOUND_NOUN_BASES:
            prefix = random.choice(self.words_storage.COMPOUND_NOUN_PREFIXES)
            base = random.choice(self.words_storage.COMPOUND_NOUN_BASES)
            return "{}-{}".format(prefix.capitalize(), base)
        else:
            # Fallback: legacy prefix + noun
            prefix = random.choice(self.words_storage.PREFIXES).lower()
            while True:
                noun = self.random_noun()
                if noun not in self.used_nouns:
                    break
            self.used_nouns.append(noun)
            if prefix.endswith(noun[0]):
                prefix += "-"
            elif " " in noun:
                prefix += " "
            return "{}{}".format(prefix, noun)

    def generate_noun_adjective(self):
        # Use hackthegibson compound adjective prefixes+bases if available
        if self.words_storage.COMPOUND_ADJ_PREFIXES and self.words_storage.COMPOUND_ADJ_BASES:
            prefix = random.choice(self.words_storage.COMPOUND_ADJ_PREFIXES)
            base = random.choice(self.words_storage.COMPOUND_ADJ_BASES)
            name = "{}-{}".format(prefix.capitalize(), base)
            # Still pick a noun to combine with if desired
            while True:
                noun = self.random_noun()
                if noun not in self.used_nouns:
                    break
            self.used_nouns.append(noun)
            return "{} {}".format(name, noun)
        else:
            # Fallback: plain noun + adjective
            while True:
                masculine = random.getrandbits(1) == 1
                noun = self.random_noun(masculine)
                adjective = self.random_adjective(masculine)
                if noun not in self.used_nouns and adjective not in self.used_adjectives:
                    break
            self.used_nouns.append(noun)
            self.used_adjectives.append(adjective)
            return "{} {}".format(noun, adjective)

    def generate_command_name(self):
        if random.randint(0, 2) == 0:
            return self.generate_noun_adjective()
        else:
            return self.generate_compound_noun()

    def generate_action(self):
        while True:
            verb = random.choice(self.words_storage.VERBS)
            if verb not in self.used_verbs:
                break
        self.used_verbs.append(verb)
        return verb
