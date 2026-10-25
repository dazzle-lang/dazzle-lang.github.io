#include <cstdio>

void run(int command) {
    switch (command) {
        case 1: std::puts("save");
        case 2: std::puts("quit"); break;
    }
}

int main() {
    run(1);
}
