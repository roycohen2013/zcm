<a style="margin-right: 1rem;" href="javascript:history.go(-1)">Back</a>
[Home](../README.md)
# ZCM Step-by-Step Tutorial

We believe the best way to learn new things is to just dive in and start making mistakes.
It's only by making those early mistakes that one truly can understand the folly of one's
ways and to grow as a result. So, without further ado, let's get started.

## Basic Types

To understand ZCM, we must start by discussing its message type-system. Every message sent inside
ZCM can be tied back to some message specification. Let's explore this with a simple, yet practical example.
Imagine that we have a typical rotation sensor such as an IMU or Gyro. Our sensor produces
yaw, pitch, and roll measurements as well as a few flags describing it's mode of operation. If we were
programming in just C code, we might design a struct type as follows:

    struct rotation_t
    {
        double yaw;
        double pitch;
        double roll;
        int   flags;
    };

In ZCM, we aim to retain this rich data structuring and layout while still being able to do
powerful message-passing in numerous different programming languages. To do this, we use a
programming-language-agnostic type specification language. Fortunately for our example above,
it is very similar to C struct syntax. Here it is:

    struct rotation_t
    {
        double yaw;
        double pitch;
        double roll;
        int32_t flags;
    };

The ZCM type is almost an exact copy. The key difference here is that in C 'int' is not
strictly defined. An 'int' can be a different size depending on the machine the software
runs on. Because a ZCM Type is a binary data-exchange format, it needs to have rigourously
defined types that mean the same thing on each machine. Here's a brief table of the default
built-in types:

<table>
    <tr><td>  int8_t   </td><td>  8-bit signed integer              </td></tr>
    <tr><td>  int16_t  </td><td>  16-bit signed integer             </td></tr>
    <tr><td>  int32_t  </td><td>  32-bit signed integer             </td></tr>
    <tr><td>  int64_t  </td><td>  64-bit signed integer             </td></tr>
    <tr><td>  float    </td><td>  32-bit IEEE floating point value  </td></tr>
    <tr><td>  double   </td><td>  64-bit IEEE floating point value  </td></tr>
    <tr><td>  string   </td><td>  UTF-8 string                      </td></tr>
    <tr><td>  boolean  </td><td>  true/false logical value          </td></tr>
    <tr><td>  byte     </td><td>  8-bit value                       </td></tr>
</table>

Believe it or not, this is all the basic knowledge needed to get started. Let's dive into
code, and build a working program using ZCM!

## Hello World

Let's build a canonical Hello World message-passing program on top of ZCM. For this we
will need two programs. One program will create and *publish* new messages and the
other program will *subscribe* to and receive those messages.

### Hello World Types

First, let's create a new zcm type in the file *msg_t.zcm*

    struct msg_t
    {
        string str;
    }

We can now use the *zcm-gen* tool to convert this type specification into bindings
for many different programming languages. We will be using C code for this example, so run:

    zcm-gen -c msg_t.zcm

This command will produce two new files in the current directory (msg\_t.h and msg\_t.c).
Feel free to browse these files for a moment to get a rough idea of how zcm-gen works. Notice
that zcm-gen has converted the *string* to a native C type. ZCM always tries to use the
native data types in each programming langauge, so the programming experience doesn't feel foreign.

    typedef struct _msg_t msg_t;
    struct _msg_t
    {
         char*      str;
    };

### Hello World Publish

For most simple programs, the only include needed is the basic zcm, but we also need to include our msg_t header

    #include <zcm/zcm.h>
    #include <msg_t.h>

In the main function we have to create a zcm instance that will manage the communications. Here, you decide which
transport protocol to use and provide an appropriate url. For this example, we'll use Inter-process Communication (IPC):

    zcm_t *zcm = zcm_create("ipc");

Finally, we simply construct a msg\_t and then publish it repeatedly:

    msg_t msg;
    msg.str = (char*)"Hello, World!";

    while (1) {
        msg_t_publish(zcm, "HELLO_WORLD", &msg);
        usleep(1000000); /* sleep for a second */
    }

And that's it! Here's the full program (publish.c):

    #include <unistd.h>
    #include <zcm/zcm.h>
    #include <msg_t.h>

    int main(int argc, char *argv[])
    {
        zcm_t *zcm = zcm_create("ipc");

        msg_t msg;
        msg.str = (char*)"Hello, World!";

        while (1) {
            msg_t_publish(zcm, "HELLO_WORLD", &msg);
            usleep(1000000); /* sleep for a second */
        }

        zcm_destroy(zcm);
        return 0;
    }


Building and running:

    cc -o publish -I. publish.c msg_t.c -lzcm
    ./publish

If you have the java ZCM tools installed, you should be able to run `zcm-spy` and
see the published messages now!

    zcm-spy --zcm-url ipc

Notice how you are unable to decode the messages inside of `zcm-spy`.
More to come on that later in this tutorial.

### Hello World Subscribe

Let's build a program to receive those messages. We'll start off the same as before
by adding the headers and creating a new zcm_t\* instance. Then, we need to *subscribe*
to the particular channel. But, first we need to create a callback function to handle all the
received messages:

    void callback_handler(const zcm_recv_buf_t *rbuf, const char *channel, const msg_t *msg, void *usr)
    {
        printf("Received a message on channel '%s'\n", channel);
        printf("msg->str = '%s'\n", msg->str);
        printf("\n");
    }

Now, in the main() function, we need to register this callback by subscribing:

    msg_t_subscribe(zcm, "HELLO_WORLD", callback_handler, NULL);

Finally, in order to dispatch messages to the callbacks, ZCM needs a thread. So, we
call into zcm to tell it to consume the current thread and use it for dispatching any
incoming messages (zcm\_run doesn't normally return):

    zcm_run(zcm);

And that's it! Here's the full program (subscribe.c):

    #include <stdio.h>
    #include <zcm/zcm.h>
    #include <msg_t.h>

    void callback_handler(const zcm_recv_buf_t *rbuf, const char *channel, const msg_t *msg, void *usr)
    {
        printf("Received a message on channel '%s'\n", channel);
        printf("msg->str = '%s'\n", msg->str);
        printf("\n");
    }

    int main(int argc, char *argv[])
    {
        zcm_t *zcm = zcm_create("ipc");
        msg_t_subscribe(zcm, "HELLO_WORLD", callback_handler, NULL);

        zcm_run(zcm);

        zcm_destroy(zcm);
        return 0;
    }

Building and running:

    cc -o subscribe -I. subscribe.c msg_t.c -lzcm
    ./subscribe

Now, with both `./publish` and `./subscribe` running, you should successfully
see a stream of data in the subscribe window!

    Received a message on channel 'HELLO_WORLD'
    msg->str = 'Hello, World!'

## Type Safety

Another super useful feature of the ZCM type system is its type-checking capabilities.
These type checks make it hard to accidentally change message types without updating
programs that rely on them. For a mission critical system such as a robotics system, this
is a crucial feature.

Let's explore by example. Let's revisit our msg\_t type and add a new field, changing
it to look as follows:

    struct msg_t
    {
        boolean can_frobinate;
        string str;
    };

Adding this new field has changed the type's encoding and any existing program not aware
of the change might decode the wrong bytes! Let's regenerate the zcmtypes:

    zcm-gen -c msg_t.zcm && cat msg_t.h

The `msg_t.h` file now contains:

    /* ... code removed ... */
    typedef struct _msg_t msg_t;
    struct _msg_t
    {
        int8_t     can_frobinate;
        char*      str;
    };
    /* ... code removed ... */

Evolving a message in this way would normally eliminate any chance at backward
compatibility, but these things can happen accidentally and can introduce bugs
that are tricky to track-down. To show how ZCM detects this issue. Let's change
publish.c to use the new type:

    msg.can_frobinate = 0;

If we rebuild the publisher and try running it with the old subscriber, the subscriber
reports:

    error -1 decoding msg_t!!!

The decoder was able to successfully determine a mismatch, and correctly rejected the
incoming data. How does this work? Well, internally ZCM computes a hash code for each
type based on the individual field types and their orderings. If any of these types
change or get re-ordered, existing programs will detect a hashcode mismatch and will
refuse to decode the received data!

# ZCM Tools

ZCM ships with a convenient set of debugging and monitoring tools. In this section
we demonstrate the usage of these tools.

### Spy

Since ZCM makes data decoupling so easy, developers tend to build applications in
several modules/processes and tie them together with ZCM message passing. In this
model, a lot of the debugging takes place at the message-passing level. Often
it's desirable to inspect/spy the messages in transit. This can be accomplished
using the `zcm-spy` tool. Note that you must have your types "compiled" into a
java jar and that jar must be listed in your `CLASSPATH` for `zcm-spy` to be able
to decode messages.

### Spy Lite

Sometimes developers don't have access to a display environment to run `zcm-spy`.
The terminal-based `zcm-spy-lite` is provided for exactly that situation.
`zcm-spy-lite` is a lite version of zcm spy that runs entirely from the terminal.
You can view message traffic and inspect message data all in a display-less
environment. All you need to do is tell `zcm-spy-lite` where it can find a shared
library of the zcmtypes you would like it to be able to decode. See below for
an example of how to use it.

### Logger

It is often desirable to record the messaging data events and record them for later
debugging. On a robotics system this is very important because often the developer
cannot debug in real-time nor deterministically reproduce bugs that have previously
occurred. By recording live events, debugging can be done after an issue occurs.
ZCM ships with a built-in logging API using `zcm/eventlog.h`. ZCM also provides
a stand-alone process `zcm-logger` that records all events it receives on the
specified transport.

### Log Player

After capturing a ZCM log, it can be *replayed* using the `zcm-logplayer` tool.
This tool republishes the events back onto a ZCM transport. For here, any ZCM
subscriber application can receive the data exactly as it would have live! This
tool, combined with the logger creates a powerful development approach for
systems with limited debug-ability.

### CsvWriter

Sometimes it is useful to convert either a zcmlog or live zcm data into csv format.
This tool, launched via

    zcm-csv-writer

does this for you. There is a default format that this writer will output in,
however often times, it is more useful to write your own CsvWriterPlugin for
custom output formatting. Examples are provided in the examples directory in zcm.

### CsvReader

Sometimes it is useful to convert a csv into a zcmlog.
This tool, launched via

    zcm-csv-reader

does this for you. There is currently no default format that this reader will
be able to read in, however you may write your own CsvReaderPlugin for
custom csv parsing. Examples are provided in the examples directory in zcm.

### Transcoder

As explained in [type generation](zcmtypesys.md), modifying a zcmtype changes
that types hash and therefore invalidates all old logs you may have. However,
sometimes it may be desirable to add a field to a type without invalidating all
prior logs. To do this we provide a log transcoder launched via

    zcm-log-transcoder

and the TranscoderPlugin interface so you may define the mapping from old log
to new log. This tool can even let you convert between completely different types

<!-- ADD MORE HERE -->

## ZCM Tools Example

For this example we'll use a special ZCM message type for counting (count\_t.zcm):

    struct count_t
    {
        int32_t val;
    }

Generate the bindings:

    zcm-gen -c count_t.zcm --c-typeinfo

The `--c-typeinfo` flag is to include type introspection in the output zcmtype
source files. This means that auto-gen functions are included in the output type
to allow zcm-spy-lite to lookup the name and fields of the type from that type's
hash. It is only recommended if plan on using `zcm-spy-lite`. If you need to save
on size or if you don't care to use `zcm-spy-lite`, you can omit this flag.

Publisher application (publish.c):

    #include <unistd.h>
    #include <zcm/zcm.h>
    #include <count_t.h>

    int main(int argc, char *argv[])
    {
        zcm_t *zcm = zcm_create("ipc");
        count_t cnt = {0};

        while (1) {
            count_t_publish(zcm, "COUNT", &cnt);
            cnt.val++;
            usleep(1000000); /* sleep for a second */
        }

        zcm_destroy(zcm);
        return 0;
    }

Building and running the publisher:

    cc -o publish -I. publish.c count_t.c -lzcm
    ./publish

Building the shared library for `zcm-spy-lite`

    cc -c -fpic count_t.c
    cc -shared -o libzcmtypes.so count_t.o

Now that you have a shared library of your zcmtypes, you need to point
`zcm-spy-lite` to the folder where that library is stored. Much like
LD\_LIBRARY\_PATH is used to help your system find the paths to shared libraries
it needs to run programs, ZCM\_SPY\_LITE\_PATH is used to point `zcm-spy-lite`
to the shared library's parent folder.

    ZCM_SPY_LITE_PATH=<full path to shared library folder>

To make that environment variable load each time you open a new terminal, you
can add it to the bottom of your shell profile. For bash this would be adding
the following line to the bottom of your ~/.bashrc

    export ZCM_SPY_LITE_PATH=<full path to shared library folder>

We can now *spy* on the ZCM traffic with:

    zcm-spy-lite --zcm-url ipc

This should report ZCM events at 1 HZ.

Record the ZCM messages for a few seconds:

    zcm-logger --zcm-url ipc

This will produce a ZCM log file in the current directory
named with the pattern: `zcmlog-{YEAR}-{MONTH}-{DAY}.00`

We can *replay* these captured events using the zcm-logplayer tool:

    zcm-logplayer --zcm-url ipc zcmlog-*.00

The replay tool alone is not very interesting until we combine it
with another application that will receive the data. For this purpose
we can use the `zcm-spy-lite` tool, running it before the replay tool:

    zcm-spy-lite --zcm-url ipc &
    zcm-logplayer --zcm-url ipc zcmlog-*.00

## Advanced ZCM Types

With a firm grasp of the ZCM tools and environment, we can start exploring
some of the more advanced topics in ZCM. Let's begin with the more
advanced features of the ZCM type system.

### Nested Types
As discussed earlier, ZCM types are strongly-typed statically-defined records
that may contain any number of fields. These fields can use a wide set of
primitive data types. However, this system is much more powerful than
containing only primitive types. The ZCM type system can support nested types
as well.

Let's see an example (nested\_types.zcm):

    struct position_t
    {
        double x, y, z;
    }

    struct cfg_t
    {
        position_t cam1;
        position_t laser1;
    }

Generate the bindings:

    zcm-gen -c nested_types.zcm

This generates the types `position_t` and `cfg_t`.

position\_t.h:

    /* ... code removed ... */
    typedef struct _position_t position_t;
    struct _position_t
    {
        double     x;
        double     y;
        double     z;
    };
    /* ... code removed ... */

cfg.h:

    /* ... code removed ... */
    typedef struct _cfg_t cfg_t;
    struct _cfg_t
    {
        position_t cam1;
        position_t laser1;
    };
    /* ... code removed ... */

As you can see, cfg\_t can be used in the same same way as any other zcmtype.
The type nesting *just works*! Note that currently, nested types are not
supported by the nodejs zcm bindings. If this is a huge pain for you,
[speak up](contributing.md)!

### Array Types

As with any programming language type system, array data types are
often desired in a message. To this end, ZCM supports two different
kinds of array types: static and dynamic sized. As you'd expect, statically
size array use the same familiar C-style syntax:

    struct st_array_t
    {
        int32_t data[8];
    }

Dynamic arrays are similar with an additional size field:

    struct dyn_array_t
    {
        int64_t sz;
        int32_t data[sz];
    }

For dynamic arrays, the size parameter may be any integer type: `int8_t`,
`int16_t`, `int32_t`, or `int64_t`

Consistent with ZCM's philosophy, these types generate language bindings that
use the language-specific idioms:

C code:

    /* ... code removed ... */
    typedef struct _st_array_t st_array_t;
    struct _st_array_t
    {
        int32_t    data[8];
    };
    /* ... code removed ... */

    /* ... code removed ... */
    typedef struct _dyn_array_t dyn_array_t;
    struct _dyn_array_t
    {
        int64_t    sz;
        int32_t    *data;
    };
    /* ... code removed ... */

C++ code:

    class st_array_t
    {
        public:
            int32_t    data[8];

        /* ... code removed ... */
    };

    class dyn_array_t
    {
        public:
            int64_t    sz;

            std::vector< int32_t > data;

        /* ... code removed ... */
    };

Note that the size parameter must be declared before the array type, otherwise zcm
wont yet know how big of an array it should be decoding when it goes to decode it!

### Multi-dimmension Arrays

ZCM also supports multiple dimensions on arrays. You can also mix
static-sized and dynamic-sized arrays along different dimensions:

    struct multdim_t
    {
        int32_t dim1;
        int32_t dim2;
        int32_t dim3;

        float array1[dim1][8][dim3];
        float array2[2][dim2][5];
    }

### Constants

ZCM supports consts embedded in the type. These constants occupy no
space in the resulting serialization: they are only present in the
language-specific generated code. Common uses for consts are for
emulating enum types and for defining flags and masks:

    struct consts_t
    {
        const int32_t VAL_FOO = 0;
        const int32_t VAL_BAR = 1;
        const int32_t VAL_BAZ = 2;
        int32_t val;

        const int32_t FLAG_A = 1;
        const int32_t FLAG_B = 2;
        const int32_t FLAG_C = 4;
        const int32_t MASK_AB = 0x03;
        int32_t flags;

        const float secs_per_tick = 0.01;
        float ticks;
    }

### Closing Thoughts on Types

The ZCM type system is incredibly rich, flexible, and composable. Nearly each
of these features can be used independent of or in conjunction with the others.
This allows users to create rich and interesting message types with ease. For a rigorous
definition of the ZCM type system, see the [ZCM Type System](zcmtypesys.md).

## Next Steps

At this point you should know enough about ZCM to implement many interesting
applications. The essence of ZCM defining ZCMTypes, coding to the pub/sub APIs,
and debugging using the built-in tool suite. This covers about 90% of the
typical ZCM development workflow.

But, there is much more to ZCM, so we recommend a few *next steps* below:

 - [Dependencies & Building](building.md)
 - [Transport Layer](transports.md)
 - [Embedded Applications](embedded.md).
 - [Frequently Asked Questions](FAQs.md)
 - [Project Philosophy](philosophy.md)
 - [Contributing](contributing.md)

<hr>
<a style="margin-right: 1rem;" href="javascript:history.go(-1)">Back</a>
[Home](../README.md)
