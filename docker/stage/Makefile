build :
	mkdir -p app
	cp -r ../../../web/web.js ../../../web/srv ../../www app
	cp ../../package.json .
	docker build -t msr-web:1 .
	docker build -t msr-web-prod:1 -f Dockerfile-prod .

clean :
	rm *~

.PHONY : build clean
