import random

with open("heart_rate.csv", "w") as file_obj:
    file_obj.write("Timestamp,Value\n")

    for index in range(10000):
        time = index * 100
        value = random.randrange(60, 90)

        file_obj.write(f"{time},{value}\n")