#include <cstdio>

struct Buffer {
    int* data;
    Buffer() : data(new int[4]{}) {}
    ~Buffer() { delete[] data; }
};

int main() {
    Buffer a;
    Buffer b = a;
    b.data[0] = 7;
    std::printf("copied, a sees %d\n", a.data[0]);
}
