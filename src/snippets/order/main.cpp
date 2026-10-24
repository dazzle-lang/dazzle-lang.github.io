#include <cstdio>

int say(const char* word) {
    std::puts(word);
    return 0;
}

int both(int a, int b) {
    return a + b;
}

int main() {
    both(say("first"), say("second"));
}
