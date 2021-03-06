#include <iostream>
#include <queue>
#include <sys/time.h>

#include "zcm/zcm-cpp.hpp"

#include "zcm/transport/generic_serial_transport.h"
#include "types/example_t.hpp"

using namespace std;
using namespace zcm;

#define PUBLISH_DT (1e6)/(500)
#define BUFFER_SIZE 200
#define MIN(A, B) ((A) < (B)) ? (A) : (B)

#define MAX_FIFO 12

queue<uint8_t> fifo;

static uint32_t get(uint8_t* data, uint32_t nData)
{
    unsigned n = MIN(MAX_FIFO, nData);
    n = MIN(fifo.size(), n);

    unsigned i;

    for (i = 0; i < n; i++) {
        data[i] = fifo.front();
        fifo.pop();
    }

    return n;
}

static uint32_t put(const uint8_t* data, uint32_t nData)
{
    unsigned n = MIN(MAX_FIFO - fifo.size(), nData);
    //cout << "Put " << n << " bytes" << endl;

    unsigned i;
    for (i = 0; i < n; i++)
        fifo.push(data[i]);

    return n;
}

static uint64_t utime()
{
    struct timeval tv;
    gettimeofday(&tv, NULL);
    return (uint64_t)tv.tv_sec * 1000000 + tv.tv_usec;
}

class Handler
{
    int64_t lastHost = 0;

  public:
    void handle(const ReceiveBuffer* rbuf, const string& chan, const example_t* msg)
    {
        cout << "Got one" << endl;

        if (msg->timestamp <= lastHost)  {
            cout << "ERROR" << endl;
            while(1);
        }
        lastHost = msg->timestamp;

    }
};

int main(int argc, const char *argv[])
{
    ZCM zcmLocal(zcm_trans_generic_serial_create(&get, &put));

    example_t example;
    example.num_ranges = 1;
    example.ranges.resize(1);
    example.ranges.at(0) = 1;

    Handler handler;
    auto sub = zcmLocal.subscribe("EXAMPLE", &Handler::handle, &handler);

    uint64_t nextPublish = utime();
    while (true)
    {
        uint64_t now = utime();
        if (now > nextPublish) {
            cout << "Publishing" << endl;
            example.timestamp = utime();
            zcmLocal.publish("EXAMPLE", &example);
            nextPublish = now + PUBLISH_DT;
        }

        zcmLocal.handleNonblock();
    }

    zcmLocal.unsubscribe(sub);

    return 0;
}
