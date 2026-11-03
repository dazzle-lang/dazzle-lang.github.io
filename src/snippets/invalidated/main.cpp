#include <cstdio>
#include <vector>

int main() {
    std::vector<int> scores;
    scores.push_back(10);
    int& first = scores[0];          // a reference into the vector
    scores.push_back(20);            // may move the array
    first += 1;
    std::printf("%d\n", scores[0]);
}
